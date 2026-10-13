// Telas da app. Cada função devolve HTML; os eventos são tratados em app.js.
import { PLANOS, STATUS, PRAZOS, PRAZO_PADRAO } from './config.js';
import { euro, esc, dataCurta, dataHora, relativo, icone, soDigitos, linkWhatsApp, hojeISO } from './ui.js';
import { resumo, lembretesPendentes, vencido } from './calculos.js';

const selo = (p) => `<span class="selo${p.prioritario ? ' selo-prio' : ''}">${p.nome}</span>`;

function item(i, meta) {
  const p = PLANOS[i.plano];
  const s = STATUS[i.status];
  const linha = meta ?? `<span class="ponto ponto-${s.id}" aria-hidden="true"></span>${s.nome}<span class="item-data">${dataCurta(i.dataIndicacao)}</span>`;
  return `<a class="item${p.prioritario ? ' item-prio' : ''}" href="#/i/${i.id}">
    ${selo(p)}
    <span class="item-corpo">
      <span class="item-nome">${esc(i.nome)}</span>
      <span class="item-meta">${linha}</span>
    </span>
    <span class="item-valor">${euro(p.comissao)}</span>
  </a>`;
}

function itemLembrete(i, agora) {
  const v = vencido(i, agora);
  const meta = `${icone('sino')}<span class="${v ? 'texto-vencido' : ''}">${v ? 'Vencido: ' : ''}${relativo(i.lembrete.quando)}</span>`;
  return item(i, meta).replace('class="item', `class="item${v ? ' item-vencido' : ''}`);
}

// ---------- Aviso de notificações ----------
export function avisoNotificacoes(estado) {
  const textos = {
    default: `<p><strong>Ativa as notificações</strong> para o telemóvel te lembrar de contactar cada cliente.</p>
      <button class="botao botao-primario" data-acao="ativar-notificacoes">${icone('sino')} Ativar notificações</button>`,
    denied: '<p><strong>Notificações bloqueadas.</strong> Ativa-as nas definições do navegador para este site, ou usa “Pôr no calendário” em cada lembrete.</p>',
    'ios-navegador': '<p><strong>No iPhone, instala a app primeiro:</strong> toca em Partilhar e depois em “Adicionar ao ecrã principal”. Só assim as notificações funcionam.</p>',
    indisponivel: '<p><strong>Este navegador não mostra notificações.</strong> Usa “Pôr no calendário” em cada lembrete.</p>',
  };
  return textos[estado] ? `<section class="aviso">${icone('sino')}<div>${textos[estado]}</div></section>` : '';
}

// ---------- Painel ----------
export function painel(estado, aviso, partilha) {
  const lista = estado.lista;
  if (!lista.length) {
    return `<section class="vazio">
      <h2>Ainda sem indicações</h2>
      <p>Regista o primeiro cliente que indicaste. As comissões e os lembretes aparecem aqui.</p>
      <a class="botao botao-primario botao-grande" href="#/nova">${icone('mais')} Nova indicação</a>
    </section>${aviso}`;
  }

  const r = resumo(lista);
  const potencial = r.recebido + r.previsto;
  const pct = potencial ? Math.round((r.recebido / potencial) * 100) : 0;
  const agora = Date.now();
  const pend = lembretesPendentes(lista);
  const nVenc = pend.filter((i) => vencido(i, agora)).length;
  const prioAbertas = lista.filter((i) => PLANOS[i.plano].prioritario && STATUS[i.status].aberto);

  return `
  <section class="resumo" aria-label="Comissões">
    <div class="resumo-topo"><span>Comissão recebida</span><span>${r.porStatus.fechado} ${r.porStatus.fechado === 1 ? 'fechada' : 'fechadas'}</span></div>
    <p class="resumo-valor">${euro(r.recebido)}</p>
    <div class="barra" role="img" aria-label="${pct}% do potencial já recebido"><span style="width:${pct}%"></span></div>
    <dl class="resumo-dados">
      <div><dt><i class="amostra amostra-prevista"></i>Prevista</dt><dd>${euro(r.previsto)}</dd></div>
      <div><dt>Potencial</dt><dd>${euro(potencial)}</dd></div>
      <div><dt>Indicações</dt><dd>${r.total}</dd></div>
    </dl>
  </section>

  <section class="estados" aria-label="Indicações por status">
    ${Object.values(STATUS).map((s) => `<a class="estado estado-${s.id}" href="#/lista/${s.id}"><strong>${r.porStatus[s.id]}</strong><span>${s.nome}</span></a>`).join('')}
  </section>

  ${aviso}

  <section class="secao">
    <div class="secao-cab"><h2>Lembretes</h2>${pend.length ? `<span class="contador${nVenc ? ' contador-alerta' : ''}">${nVenc ? `${nVenc} vencido${nVenc > 1 ? 's' : ''}` : `${pend.length} pendente${pend.length > 1 ? 's' : ''}`}</span>` : ''}</div>
    ${pend.length ? `<div class="lista">${pend.map((i) => itemLembrete(i, agora)).join('')}</div>` : '<p class="nota">Nenhum lembrete pendente.</p>'}
  </section>

  <section class="secao">
    <div class="secao-cab"><h2>3P e 4P</h2><span class="contador">${prioAbertas.length} em aberto</span></div>
    <div class="prio-grelha">
      ${['4P', '3P'].map((id) => {
        const pp = r.porPlano[id];
        return `<a class="prio" href="#/lista/${id}">
          <span class="prio-cab">${selo(PLANOS[id])}<strong>${pp.total}</strong></span>
          <span>${pp.fechadas} fechada${pp.fechadas === 1 ? '' : 's'}, ${pp.abertas} em aberto</span>
          <span class="prio-valor">${euro(pp.recebido)} recebidos</span>
        </a>`;
      }).join('')}
    </div>
    ${prioAbertas.length ? `<div class="lista">${prioAbertas.map((i) => item(i)).join('')}</div>` : ''}
  </section>

  ${blocoBackup(partilha)}`;
}

function blocoBackup(partilha) {
  return `<section class="secao">
    <h2>Cópia de segurança</h2>
    <p class="nota">Os dados ficam guardados só neste telemóvel. Exporta o CSV de vez em quando e guarda-o no Drive ou no e-mail.</p>
    <button class="botao botao-secundario" data-acao="exportar">${icone('descarregar')} Exportar CSV</button>
    ${partilha ? `<button class="botao botao-secundario" data-acao="partilhar">${icone('partilhar')} Enviar CSV</button>` : ''}
  </section>`;
}

// ---------- Lista ----------
const FILTROS = [
  ['todas', 'Todas'], ['prio', '3P e 4P'], ['indicado', 'Indicado'], ['negociacao', 'Em negociação'],
  ['fechado', 'Fechado'], ['perdido', 'Perdido'], ['4P', '4P'], ['3P', '3P'], ['1P2P', '1P/2P'],
];

export function filtrar(lista, filtro, busca) {
  const b = busca.trim().toLowerCase();
  const bd = soDigitos(b);
  return lista.filter((i) => {
    if (filtro === 'prio' && !PLANOS[i.plano].prioritario) return false;
    if (STATUS[filtro] && i.status !== filtro) return false;
    if (PLANOS[filtro] && i.plano !== filtro) return false;
    if (b && !i.nome.toLowerCase().includes(b) && !(bd && soDigitos(i.telefone).includes(bd))) return false;
    return true;
  });
}

export function resultados(estado, filtro) {
  const l = filtrar(estado.lista, filtro, estado.busca);
  if (!l.length) {
    return estado.lista.length
      ? '<p class="vazio-curto">Nenhuma indicação com este filtro.</p>'
      : `<p class="vazio-curto">Ainda não há indicações.</p><a class="botao botao-primario" href="#/nova">${icone('mais')} Nova indicação</a>`;
  }
  const soma = l.reduce((t, i) => t + PLANOS[i.plano].comissao, 0);
  return `<p class="contagem">${l.length} indicaç${l.length === 1 ? 'ão' : 'ões'}, ${euro(soma)} em comissões</p>
    <div class="lista">${l.map((i) => item(i)).join('')}</div>`;
}

export function lista(estado, filtro = 'todas') {
  return `
  <nav class="filtros" aria-label="Filtros">
    ${FILTROS.map(([id, nome]) => `<a class="chip" href="#/lista/${id}"${id === filtro ? ' aria-current="page"' : ''}>${nome}</a>`).join('')}
  </nav>
  <div class="pesquisa"><input id="busca" type="search" placeholder="Procurar nome ou contacto" value="${esc(estado.busca)}" autocomplete="off" aria-label="Procurar"></div>
  <div id="resultados">${resultados(estado, filtro)}</div>`;
}

// ---------- Formulários ----------
function campoTexto(nome, rotulo, tipo, attrs, valor = '') {
  return `<div class="campo">
    <label for="c-${nome}">${rotulo}</label>
    <div class="campo-linha">
      <input id="c-${nome}" name="${nome}" type="${tipo}" ${attrs} value="${esc(valor)}" autocomplete="off" autocorrect="off" spellcheck="false">
      <button type="button" class="botao-colar" data-acao="colar" data-campo="${nome}">${icone('colar')}Colar</button>
    </div>
  </div>`;
}

const camposCliente = (i = {}) =>
  campoTexto('nome', 'Nome do cliente', 'text', 'autocapitalize="words" enterkeyhint="next" required', i.nome) +
  campoTexto('telefone', 'Contacto', 'tel', 'inputmode="tel" enterkeyhint="done"', i.telefone);

function opcoesPlano(atual) {
  return `<fieldset class="grupo"><legend>Plano</legend><div class="opcoes">
    ${Object.values(PLANOS).map((p) => `<label class="opcao opcao-plano${p.prioritario ? ' opcao-prio' : ''}">
      <input type="radio" name="plano" value="${p.id}"${atual === p.id ? ' checked' : ''}>
      <span><span class="opcao-topo"><strong>${p.nome}</strong><em>${euro(p.comissao)}</em></span><small>${p.descricao}</small></span>
    </label>`).join('')}
  </div></fieldset>`;
}

function camposLembrete(comNenhum) {
  const op = (valor, texto, marcado) => `<label class="opcao opcao-compacta"><input type="radio" name="lembrete" value="${valor}"${marcado ? ' checked' : ''}><span>${texto}</span></label>`;
  return `<div class="opcoes opcoes-2">
      ${PRAZOS.map((p) => op(`prazo:${p.dias}`, `Daqui a ${p.nome}`, p.dias === PRAZO_PADRAO)).join('')}
      ${op('data', 'Escolher data', false)}
      ${comNenhum ? op('nenhum', 'Sem lembrete', false) : ''}
    </div>
    <div class="data-especifica" hidden>
      <label class="campo-mini">Dia<input type="date" name="lembrete-data" min="${hojeISO()}"></label>
      <label class="campo-mini">Hora<input type="time" name="lembrete-hora" value="10:00"></label>
    </div>`;
}

export function nova() {
  return `<form id="form-nova" class="formulario" novalidate autocomplete="off">
    ${camposCliente()}
    ${opcoesPlano()}
    <div class="data-fixa">${icone('cadeado')}<span>Data da indicação: <strong>${dataHora(new Date().toISOString())}</strong><br><small>Fica registada ao guardar e não pode ser alterada.</small></span></div>
    <fieldset class="grupo"><legend>Lembrete para contactar o cliente</legend>${camposLembrete(true)}</fieldset>
    <button class="botao botao-primario botao-grande" type="submit">${icone('certo')} Guardar indicação</button>
  </form>`;
}

// ---------- Detalhe ----------
function blocoLembrete(i) {
  const s = STATUS[i.status];
  if (!s.aberto) return `<p class="nota">Indicação ${s.nome.toLowerCase()}. Sem lembretes ativos.</p>`;
  const l = i.lembrete;
  const pendente = l && !l.feito;
  const form = `<form id="form-lembrete" class="formulario formulario-lembrete" data-id="${i.id}"${pendente ? ' hidden' : ''} novalidate>
      ${camposLembrete(false)}
      <button class="botao botao-primario" type="submit">${icone('sino')} Guardar lembrete</button>
    </form>`;

  if (pendente) {
    const v = vencido(i);
    return `<div class="lembrete-cartao${v ? ' lembrete-vencido' : ''}">
        <span class="lembrete-estado">${v ? 'Vencido, contacta o cliente' : 'Agendado'}</span>
        <strong>${relativo(l.quando)}</strong>
        <span>${dataHora(l.quando)}</span>
      </div>
      <button class="botao botao-primario" data-acao="contactei" data-id="${i.id}">${icone('certo')} Já contactei</button>
      <div class="botoes-2">
        <button class="botao botao-secundario" data-acao="adiar" data-dias="1" data-id="${i.id}">Adiar 1 dia</button>
        <button class="botao botao-secundario" data-acao="adiar" data-dias="7" data-id="${i.id}">Adiar 1 semana</button>
        <button class="botao botao-secundario" data-acao="calendario" data-id="${i.id}">${icone('calendario')} Pôr no calendário</button>
        <button class="botao botao-secundario" data-acao="alternar" data-alvo="form-lembrete">Mudar data</button>
      </div>
      ${form}`;
  }
  const txt = l?.feito ? `Último contacto marcado a ${dataHora(l.contactadoEm)}. Agenda o próximo:` : 'Sem lembrete ativo. Agenda um:';
  return `<p class="nota">${txt}</p>${form}`;
}

export function detalhe(estado, id) {
  const i = estado.lista.find((x) => x.id === id);
  if (!i) return null;
  const p = PLANOS[i.plano];
  const dig = soDigitos(i.telefone);

  return `
  <section class="ficha${p.prioritario ? ' ficha-prio' : ''}">
    <div class="ficha-topo">${selo(p)}<span class="ficha-comissao">${euro(p.comissao)}${i.status === 'fechado' ? ' recebidos' : ''}</span></div>
    <h2 class="ficha-nome">${esc(i.nome)}</h2>
    ${i.telefone ? `<p class="ficha-tel">${esc(i.telefone)}</p>
    <div class="acoes-contacto">
      <a class="botao botao-secundario" href="tel:${dig}">${icone('telefone')}Ligar</a>
      <a class="botao botao-secundario" href="${linkWhatsApp(i.telefone)}" target="_blank" rel="noopener">${icone('mensagem')}WhatsApp</a>
      <button class="botao botao-secundario" data-acao="copiar" data-texto="${esc(i.telefone)}">${icone('copiar')}Copiar</button>
    </div>` : '<p class="nota">Sem contacto registado.</p>'}
    <p class="ficha-data">${icone('cadeado')}Indicado a ${dataHora(i.dataIndicacao)}</p>
  </section>

  <section class="secao">
    <h2>Status</h2>
    <div class="estados-botoes">
      ${Object.values(STATUS).map((s) => `<button class="botao-estado estado-${s.id}" data-acao="status" data-id="${i.id}" data-valor="${s.id}" aria-pressed="${s.id === i.status}">${s.nome}</button>`).join('')}
    </div>
  </section>

  <section class="secao"><h2>Lembrete</h2>${blocoLembrete(i)}</section>

  <section class="secao">
    <h2>Histórico</h2>
    <ol class="historico">
      ${[...i.historico].reverse().map((h) => `<li><span class="ponto ponto-${h.status}" aria-hidden="true"></span>${STATUS[h.status].nome}<time>${dataHora(h.em)}</time></li>`).join('')}
    </ol>
  </section>

  <section class="secao">
    <button class="botao botao-secundario" data-acao="alternar" data-alvo="form-editar">${icone('lapis')} Corrigir nome, contacto ou plano</button>
    <form id="form-editar" class="formulario formulario-editar" data-id="${i.id}" hidden novalidate autocomplete="off">
      ${camposCliente(i)}
      ${opcoesPlano(i.plano)}
      <button class="botao botao-primario" type="submit">Guardar alterações</button>
    </form>
    <button class="botao botao-perigo" data-acao="apagar" data-id="${i.id}">Apagar indicação</button>
  </section>`;
}
