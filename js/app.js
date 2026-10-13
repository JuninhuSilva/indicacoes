// Arranque, navegação e ações.
import * as store from './store.js';
import * as V from './views.js';
import { PLANOS, STATUS } from './config.js';
import { toast, descarregar, soDigitos, limparNome, limparTelefone } from './ui.js';
import { calcularQuando, adiar } from './calculos.js';
import * as L from './lembretes.js';
import { gerarCSV, nomeFicheiroCSV, podePartilhar } from './exportar.js';

const app = document.getElementById('app');
const titulo = document.getElementById('titulo');
const voltar = document.getElementById('voltar');
const estado = { lista: [], busca: '' };

function rota() {
  const [nome, param = ''] = location.hash.replace(/^#\/?/, '').split('/');
  return { nome: nome || 'painel', param: decodeURIComponent(param) };
}

async function recarregar() {
  estado.lista = await store.todos();
  L.agendarProxima(estado.lista);
}

function render() {
  const r = rota();
  let html; let t; let tab;
  if (r.nome === 'lista') {
    html = V.lista(estado, r.param || 'todas'); t = 'Indicações'; tab = 'lista';
  } else if (r.nome === 'nova') {
    html = V.nova(); t = 'Nova indicação'; tab = 'nova';
  } else if (r.nome === 'i') {
    html = V.detalhe(estado, r.param) ?? '<p class="vazio-curto">Esta indicação já não existe.</p><a class="botao botao-secundario" href="#/lista">Ver lista</a>';
    t = 'Indicação'; tab = 'lista';
  } else {
    html = V.painel(estado, V.avisoNotificacoes(L.estadoNotificacoes()), podePartilhar()); t = 'Painel'; tab = 'painel';
  }
  app.innerHTML = html;
  titulo.textContent = t;
  voltar.hidden = !['i', 'nova'].includes(r.nome);
  document.querySelectorAll('[data-tab]').forEach((a) => {
    if (a.dataset.tab === tab) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
}

// ---------- Leitura de formulários ----------
function lerLembrete(f) {
  const v = f.elements.lembrete.value;
  if (!v || v === 'nenhum') return null;
  let quando;
  if (v.startsWith('prazo:')) {
    quando = calcularQuando({ modo: 'prazo', dias: v.split(':')[1] });
  } else {
    const data = f.elements['lembrete-data'].value;
    if (!data) throw new Error('Escolhe o dia do lembrete');
    quando = calcularQuando({ modo: 'data', data, hora: f.elements['lembrete-hora'].value });
    if (new Date(quando) <= new Date()) throw new Error('Essa data já passou. Escolhe uma data futura.');
  }
  return { modo: v.startsWith('prazo:') ? 'prazo' : 'data', quando, feito: false, notificado: false, criado: new Date().toISOString() };
}

function lerCliente(f) {
  const nome = limparNome(f.elements.nome.value);
  const telefone = limparTelefone(f.elements.telefone.value);
  const plano = f.elements.plano.value;
  if (!nome) { f.elements.nome.focus(); throw new Error('Escreve o nome do cliente'); }
  if (!PLANOS[plano]) throw new Error('Escolhe o plano');
  return { nome, telefone, plano };
}

function duplicado(telefone, ignorarId) {
  const d = soDigitos(telefone);
  return d.length >= 6 && estado.lista.find((i) => i.id !== ignorarId && soDigitos(i.telefone) === d);
}

// ---------- Formulários ----------
const formularios = {
  async 'form-nova'(f) {
    const cliente = lerCliente(f);
    const lembrete = lerLembrete(f);
    const dup = duplicado(cliente.telefone);
    if (dup && !confirm(`Já existe uma indicação com este contacto (${dup.nome}). Guardar mesmo assim?`)) return;
    if (lembrete) L.pedirPermissao(); // pedido ainda dentro do toque no botão
    const agora = new Date().toISOString();
    const item = {
      id: store.novoId(), ...cliente, status: 'indicado',
      dataIndicacao: agora, atualizado: agora, lembrete,
      historico: [{ status: 'indicado', em: agora }],
    };
    await store.guardar(item);
    await recarregar();
    toast('Indicação guardada');
    location.hash = `#/i/${item.id}`;
  },

  async 'form-editar'(f) {
    const cliente = lerCliente(f);
    const dup = duplicado(cliente.telefone, f.dataset.id);
    if (dup && !confirm(`Já existe uma indicação com este contacto (${dup.nome}). Guardar mesmo assim?`)) return;
    await store.atualizar(f.dataset.id, (i) => Object.assign(i, cliente));
    await recarregar(); render();
    toast('Dados corrigidos');
  },

  async 'form-lembrete'(f) {
    const lembrete = lerLembrete(f);
    L.pedirPermissao();
    await store.atualizar(f.dataset.id, (i) => { i.lembrete = lembrete; });
    await recarregar(); render();
    toast('Lembrete guardado');
  },
};

// ---------- Ações (botões) ----------
const acoes = {
  async colar(b) {
    const input = b.closest('.campo').querySelector('input');
    try {
      const texto = await navigator.clipboard.readText();
      if (!texto.trim()) throw new Error();
      input.value = b.dataset.campo === 'telefone' ? limparTelefone(texto) : limparNome(texto);
    } catch {
      input.focus();
      toast('Toca sem largar no campo e escolhe Colar');
    }
  },

  async copiar(b) {
    try { await navigator.clipboard.writeText(b.dataset.texto); toast('Contacto copiado'); }
    catch { toast('Não foi possível copiar'); }
  },

  async status(b) {
    const v = b.dataset.valor;
    const item = await store.atualizar(b.dataset.id, (i) => {
      if (i.status !== v) { i.status = v; i.historico.push({ status: v, em: new Date().toISOString() }); }
    });
    await recarregar(); render();
    toast(v === 'fechado' ? `Fechado! +${PLANOS[item.plano].comissao} € de comissão` : `Status: ${STATUS[v].nome}`);
  },

  async contactei(b) {
    await store.atualizar(b.dataset.id, (i) => { i.lembrete.feito = true; i.lembrete.contactadoEm = new Date().toISOString(); });
    await recarregar(); render();
    toast('Contacto registado');
  },

  async adiar(b) {
    const dias = Number(b.dataset.dias);
    await store.atualizar(b.dataset.id, (i) => {
      i.lembrete.quando = adiar(i.lembrete.quando, dias);
      i.lembrete.notificado = false;
    });
    await recarregar(); render();
    toast(dias === 1 ? 'Adiado 1 dia' : 'Adiado 1 semana');
  },

  async calendario(b) {
    L.descarregarICS(await store.obter(b.dataset.id));
    toast('Abre o ficheiro para o adicionar ao calendário');
  },

  alternar(b) {
    const alvo = document.getElementById(b.dataset.alvo);
    alvo.hidden = !alvo.hidden;
    if (!alvo.hidden) alvo.scrollIntoView({ behavior: 'smooth', block: 'start' });
  },

  async apagar(b) {
    const i = estado.lista.find((x) => x.id === b.dataset.id);
    if (!confirm(`Apagar a indicação de ${i.nome}? Esta ação não pode ser desfeita.`)) return;
    await store.apagar(i.id);
    await recarregar();
    toast('Indicação apagada');
    location.hash = '#/lista';
  },

  exportar() {
    if (!estado.lista.length) return toast('Ainda não há dados para exportar');
    descarregar(gerarCSV(estado.lista), nomeFicheiroCSV(), 'text/csv;charset=utf-8');
    toast('CSV exportado');
  },

  async partilhar() {
    if (!estado.lista.length) return toast('Ainda não há dados para exportar');
    const f = new File([gerarCSV(estado.lista)], nomeFicheiroCSV(), { type: 'text/csv' });
    try { await navigator.share({ files: [f], title: 'Indicações (CSV)' }); } catch { /* cancelado */ }
  },

  async 'ativar-notificacoes'() {
    const p = await L.pedirPermissao();
    render();
    toast(p === 'granted' ? 'Notificações ativadas' : 'Notificações não ativadas');
    L.verificarAgora();
  },
};

// ---------- Eventos ----------
app.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-acao]');
  if (!b || !acoes[b.dataset.acao]) return;
  e.preventDefault();
  try { await acoes[b.dataset.acao](b); } catch (err) { toast(err.message || 'Algo correu mal'); }
});

app.addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target;
  try { await formularios[f.id]?.(f); } catch (err) { toast(err.message || 'Algo correu mal'); }
});

app.addEventListener('change', (e) => {
  if (e.target.name === 'lembrete') {
    const caixa = e.target.form.querySelector('.data-especifica');
    caixa.hidden = e.target.value !== 'data';
    if (!caixa.hidden) caixa.querySelector('input[type=date]').focus();
  }
});

app.addEventListener('input', (e) => {
  if (e.target.id === 'busca') {
    estado.busca = e.target.value;
    document.getElementById('resultados').innerHTML = V.resultados(estado, rota().param || 'todas');
  }
});

voltar.addEventListener('click', () => (history.length > 1 ? history.back() : (location.hash = '#/')));

window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });

// Volta a atualizar quando a app regressa ao ecrã (ex.: depois de uma chamada).
document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState !== 'visible') return;
  await recarregar();
  if (rota().nome !== 'nova' && !document.querySelector('form:not([hidden]) input:focus')) render();
  L.verificarAgora();
});

// ---------- Arranque ----------
async function iniciar() {
  if ('serviceWorker' in navigator) {
    try { await navigator.serviceWorker.register('./sw.js'); } catch (err) { console.warn('Service worker:', err); }
    navigator.serviceWorker.addEventListener('message', async (e) => {
      if (e.data?.tipo === 'abrir' && e.data.id) location.hash = `#/i/${e.data.id}`;
      if (e.data?.tipo === 'atualizado') {
        await recarregar();
        if (rota().nome !== 'nova') render();
      }
    });
  }
  navigator.storage?.persist?.();
  await recarregar();
  render();
  L.verificarAgora();
  if (L.estadoNotificacoes() === 'granted') L.registarVerificacaoPeriodica();
}

iniciar();
