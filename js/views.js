// Telas da app. Cada função devolve HTML; os eventos são tratados em app.js.
import { PLANOS, STATUS, PRAZOS, PRAZO_PADRAO, HORA_INSTALACAO } from './config.js';
import { euro, esc, dataCurta, dataHora, relativo, icone, soDigitos, linkWhatsApp, hojeISO, diaMes, diaMesAno } from './ui.js';
import { resumo, lembretesPendentes, instalacoesPendentes, vencido, instalado, quandoInstalacao } from './calculos.js';
import { linkVendedor } from './vendedor.js';

const selo = (p) => `<span class="selo${p.prioritario ? ' selo-prio' : ''}">${p.nome}</span>`;

// Texto curto do estado da instalação para as listas
function textoInstalacao(i, agora = Date.now()) {
  if (!i.instalacao?.data) return 'Fechado, falta a data da instalação';
  if (instalado(i, agora)) return `Instalado a ${diaMes(i.instalacao.data)}`;
  return `Instalação ${relativo(quandoInstalacao(i)).replace(/^./, (c) => c.toLowerCase())}`;
}

function item(i, meta, extraClasse = '') {
  const p = PLANOS[i.plano];
  const s = STATUS[i.status];
  const linha = meta ?? (i.status === 'fechado'
    ? `<span class="ponto ponto-fechado" aria-hidden="true"></span>${textoInstalacao(i)}`
    : `<span class="ponto ponto-${s.id}" aria-hidden="true"></span>${s.nome}<span class="item-data">${dataCurta(i.dataIndicacao)}</span>`);
  return `<a class="item${p.prioritario ? ' item-prio' : ''}${extraClasse}" href="#/i/${i.id}">
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
  return item(i, meta, v ? ' item-vencido' : '');
}

function itemInstalacao(i) {
  const hoje = i.instalacao?.data === hojeISO();
  const meta = `${icone('casa')}<span class="${!i.instalacao?.data ? 'texto-vencido' : ''}">${hoje ? 'Instalação hoje' : textoInstalacao(i)}</span>`;
  return item(i, meta, hoje ? ' item-hoje' : '');
}

// ---------- Aviso de notificações ----------
export function avisoNotificacoes(estado) {
  const textos = {
    default: `<p><strong>Ativa as notificações</strong> para o telemóvel te lembrar de contactar clientes e avisar no dia de cada instalação.</p>
      <button class="botao botao-primario" data-acao="ativar-notificacoes">${icone('sino')} Ativar notificações</button>`,
    denied: '<p><strong>Notificações bloqueadas.</strong> Ativa-as nas definições do navegador para este site, ou usa “Pôr no calendário”.</p>',
    'ios-navegador': '<p><strong>No iPhone, instala a app primeiro:</strong> toca em Partilhar e depois em “Adicionar ao ecrã principal”. Só assim as notificações funcionam.</p>',
    indisponivel: '<p><strong>Este navegador não mostra notificações.</strong> Usa “Pôr no calendário”.</p>',
  };
  return textos[estado] ? `<section class="aviso">${icone('sino')}<div>${textos[estado]}</div></section>` : '';
}

// ---------- Painel ----------
export function painel(estado, aviso, partilha) {
  const lista = estado.lista;
  if (!lista.length) {
    return `<section class="vazio">
      <h2>Ainda sem indicações</h2>
      <p>Regista o primeiro cliente que indicaste. As comissões, instalações e lembretes aparecem aqui.</p>
      <a class="botao botao-primario botao-grande" href="#/nova">${icone('mais')} Nova indicação</a>
    </section>${aviso}${blocoVendedor(estado)}`;
  }

  const agora = Date.now();
  const r = resumo(lista, agora);
  const total = r.recebido + r.aReceber + r.previsto;
  const pct = (v) => (total ? (v / total) * 100 : 0).toFixed(1);
  const pend = lembretesPendentes(lista);
  const nVenc = pend.filter((i) => vencido(i, agora)).length;
  const inst = instalacoesPendentes(lista, agora);
  const prioAbertas = lista.filter((i) => PLANOS[i.plano].prioritario && (STATUS[i.status].aberto || (i.status === 'fechado' && !instalado(i, agora))));

  return `
  <section class="resumo" aria-label="Comissões">
    <div class="resumo-topo"><span>Comissão recebida</span><span>${r.instaladas} instalad${r.instaladas === 1 ? 'a' : 'as'}</span></div>
    <p class="resumo-valor">${euro(r.recebido)}</p>
    <div class="barra" role="img" aria-label="Recebido ${euro(r.recebido)}, a receber ${euro(r.aReceber)}, previsto ${euro(r.previsto)}">
      <span class="barra-recebido" style="width:${pct(r.recebido)}%"></span><span class="barra-receber" style="width:${pct(r.aReceber)}%"></span>
    </div>
    <dl class="resumo-dados">
      <div><dt><i class="amostra amostra-receber"></i>A receber</dt><dd>${euro(r.aReceber)}</dd></div>
      <div><dt><i class="amostra amostra-prevista"></i>Em aberto</dt><dd>${euro(r.previsto)}</dd></div>
      <div><dt>Indicações</dt><dd>${r.total}</dd></div>
    </dl>
  </section>

  <section class="estados" aria-label="Indicações por status">
    ${Object.values(STATUS).map((s) => `<a class="estado estado-${s.id}" href="#/lista/${s.id}"><strong>${r.porStatus[s.id]}</strong><span>${s.nome}</span></a>`).join('')}
  </section>

  ${aviso}

  ${inst.length ? `<section class="secao">
    <div class="secao-cab"><h2>Instalações</h2><span class="contador">${euro(r.aReceber)} a receber</span></div>
    <div class="lista">${inst.map(itemInstalacao).join('')}</div>
  </section>` : ''}

  <section class="secao">
    <div class="secao-cab"><h2>Lembretes</h2>${pend.length ? `<span class="contador${nVenc ? ' contador-alerta' : ''}">${nVenc ? `${nVenc} vencido${nVenc > 1 ? 's' : ''}` : `${pend.length} pendente${pend.length > 1 ? 's' : ''}`}</span>` : ''}</div>
    ${pend.length ? `<div class="lista">${pend.map((i) => itemLembrete(i, agora)).join('')}</div>` : '<p class="nota">Nenhum lembrete pendente.</p>'}
  </section>

  <section class="secao">
    <div class="secao-cab"><h2>3P e 4P</h2><span class="contador">${prioAbertas.length} por receber</span></div>
    <div class="prio-grelha">
      ${['4P', '3P'].map((id) => {
        const pp = r.porPlano[id];
        return `<a class="prio" href="#/lista/${id}">
          <span class="prio-cab">${selo(PLANOS[id])}<strong>${pp.total}</strong></span>
          <span>${pp.instaladas} instalada${pp.instaladas === 1 ? '' : 's'}, ${pp.abertas} por receber</span>
          <span class="prio-valor">${euro(pp.recebido)} recebidos</span>
        </a>`;
      }).join('')}
    </div>
    ${prioAbertas.length ? `<div class="lista">${prioAbertas.map((i) => item(i)).join('')}</div>` : ''}
  </section>

  ${blocoVendedor(estado)}
  ${blocoBackup(partilha)}`;
}

function blocoVendedor(estado) {
  return `<section class="secao">
    <h2>WhatsApp do vendedor</h2>
    <p class="nota">Guarda o número dele e o botão “Enviar ao vendedor” abre a conversa já com os dados do cliente.</p>
    <form id="form-vendedor" class="campo-linha" novalidate autocomplete="off">
      <input name="vendedor" type="tel" inputmode="tel" placeholder="Ex.: 912 345 678" value="${esc(estado.vendedor)}" aria-label="Número de WhatsApp do vendedor">
      <button class="botao-colar" type="submit">Guardar</button>
    </form>
  </section>`;
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
  ['fechado', 'Fechado'], ['instalar', 'Por instalar'], ['instalado', 'Instalado'], ['perdido', 'Perdido'],
  ['4P', '4P'], ['3P', '3P'], ['1P2P', '1P/2P'],
];

export function filtrar(lista, filtro, busca) {
  const b = busca.trim().toLowerCase();
  const bd = soDigitos(b);
  const agora = Date.now();
  return lista.filter((i) => {
    if (filtro === 'prio' && !PLANOS[i.plano].prioritario) return false;
    if (filtro === 'instalado' && !instalado(i, agora)) return false;
    if (filtro === 'instalar' && !(i.status === 'fechado' && !instalado(i, agora))) return false;
    if (STATUS[filtro] && i.status !== filtro) return false;
    if (PLANOS[filtro] && i.plano !== filtro) return false;
    if (b && !i.nome.toLowerCase().includes(b) && !(bd && soDigitos(i.telefone).includes(bd)) && !(i.notas || '').toLowerCase().includes(b)) return false;
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
  <div class="pesquisa"><input id="busca" type="search" placeholder="Procurar nome, contacto ou nota" value="${esc(estado.busca)}" autocomplete="off" aria-label="Procurar"></div>
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

const campoNotas = (valor = '', id = 'c-notas') => `<div class="campo">
    <label for="${id}">Notas <small>(opcional)</small></label>
    <textarea id="${id}" name="notas" rows="3" placeholder="Ex.: prefere contacto depois das 18h, já tem fibra da concorrência…" autocapitalize="sentences">${esc(valor)}</textarea>
  </div>`;

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
    ${campoNotas()}
    <div class="data-fixa">${icone('cadeado')}<span>Data da indicação: <strong>${dataHora(new Date().toISOString())}</strong><br><small>Fica registada ao guardar e não pode ser alterada.</small></span></div>
    <fieldset class="grupo"><legend>Lembrete para contactar o cliente</legend>${camposLembrete(true)}</fieldset>
    <button class="botao botao-primario botao-grande" type="submit">${icone('certo')} Guardar indicação</button>
  </form>`;
}

// ---------- Detalhe ----------
function blocoLembrete(i) {
  const s = STATUS[i.status];
  if (!s.aberto) return `<p class="nota">Indicação ${s.id === 'fechado' ? 'fechada' : 'perdida'}. Sem lembretes de contacto ativos.</p>`;
  const l = i.lembrete;
  const pendente = l && !l.feito;
  const form = `<form id="form-lembrete" class="formulario formulario-caixa" data-id="${i.id}"${pendente ? ' hidden' : ''} novalidate>
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

function formInstalacao(i, escondido) {
  const fechado = i.status === 'fechado';
  return `<form id="form-instalacao" class="formulario formulario-caixa" data-id="${i.id}"${escondido ? ' hidden' : ''} novalidate>
    <div class="campo">
      <label for="c-instalacao">${fechado ? 'Data da instalação' : 'Fechado! Quando é a instalação?'}</label>
      <input id="c-instalacao" class="entrada" type="date" name="instalacao" value="${i.instalacao?.data || ''}">
    </div>
    <p class="nota">No dia da instalação recebes uma notificação às ${HORA_INSTALACAO}:00 e a comissão passa a recebida.</p>
    <button class="botao botao-primario" type="submit">${icone('certo')} ${fechado ? 'Guardar data' : 'Confirmar fechado'}</button>
    ${fechado ? '' : `<button class="botao botao-secundario" type="button" data-acao="fechar-sem-data" data-id="${i.id}">Fechado, ainda sem data</button>`}
  </form>`;
}

function blocoInstalacao(i) {
  if (i.status !== 'fechado') return formInstalacao(i, true);
  const p = PLANOS[i.plano];
  const d = i.instalacao?.data;
  if (!d) {
    return `<div class="instalacao-cartao instalacao-falta">
        <span class="lembrete-estado">Falta a data da instalação</span>
        <strong>${euro(p.comissao)} a receber</strong>
        <span>Marca o dia para receberes o aviso.</span>
      </div>${formInstalacao(i, false)}`;
  }
  const feito = instalado(i);
  const hoje = d === hojeISO();
  return `<div class="instalacao-cartao${feito ? ' instalacao-feita' : ''}">
      <span class="lembrete-estado">${feito ? (hoje ? 'Instalação hoje, comissão recebida' : 'Instalado, comissão recebida') : 'Instalação agendada'}</span>
      <strong>${feito ? `${euro(p.comissao)} recebidos` : relativo(quandoInstalacao(i))}</strong>
      <span>${icone('casa')} ${diaMesAno(d)}</span>
    </div>
    <div class="botoes-2">
      <button class="botao botao-secundario" data-acao="alternar" data-alvo="form-instalacao">Mudar data</button>
      ${feito ? '' : `<button class="botao botao-secundario" data-acao="calendario-instalacao" data-id="${i.id}">${icone('calendario')} Pôr no calendário</button>`}
    </div>
    ${formInstalacao(i, true)}`;
}

export function detalhe(estado, id) {
  const i = estado.lista.find((x) => x.id === id);
  if (!i) return null;
  const p = PLANOS[i.plano];
  const dig = soDigitos(i.telefone);
  const pago = instalado(i);

  return `
  <section class="ficha${p.prioritario ? ' ficha-prio' : ''}">
    <div class="ficha-topo">${selo(p)}<span class="ficha-comissao">${euro(p.comissao)}${pago ? ' recebidos' : i.status === 'fechado' ? ' a receber' : ''}</span></div>
    <h2 class="ficha-nome">${esc(i.nome)}</h2>
    ${i.telefone ? `<p class="ficha-tel">${esc(i.telefone)}</p>
    <div class="acoes-contacto">
      <a class="botao botao-secundario" href="tel:${dig}">${icone('telefone')}Ligar</a>
      <a class="botao botao-secundario" href="${linkWhatsApp(i.telefone)}" target="_blank" rel="noopener">${icone('mensagem')}WhatsApp</a>
      <button class="botao botao-secundario" data-acao="copiar" data-texto="${esc(i.telefone)}">${icone('copiar')}Copiar</button>
    </div>` : '<p class="nota">Sem contacto registado.</p>'}
    <a class="botao botao-whatsapp" href="${linkVendedor(i, estado.vendedor)}" target="_blank" rel="noopener">${icone('enviar')} Enviar ao vendedor</a>
    ${estado.vendedor ? '' : '<p class="nota nota-centro">Guarda o WhatsApp do vendedor no Painel para abrir direto a conversa dele.</p>'}
    <p class="ficha-data">${icone('cadeado')}Indicado a ${dataHora(i.dataIndicacao)}</p>
  </section>

  <section class="secao">
    <h2>Status</h2>
    <div class="estados-botoes">
      ${Object.values(STATUS).map((s) => `<button class="botao-estado estado-${s.id}" data-acao="status" data-id="${i.id}" data-valor="${s.id}" aria-pressed="${s.id === i.status}">${s.nome}</button>`).join('')}
    </div>
    ${blocoInstalacao(i)}
  </section>

  <section class="secao">
    <h2>Notas</h2>
    <form id="form-notas" class="formulario" data-id="${i.id}" novalidate>
      <textarea name="notas" rows="${Math.min(8, Math.max(3, (i.notas || '').split('\n').length + 1))}" placeholder="Algo relevante sobre este cliente…" aria-label="Notas" autocapitalize="sentences">${esc(i.notas || '')}</textarea>
      <button class="botao botao-secundario" type="submit">${icone('nota')} Guardar notas</button>
    </form>
  </section>

  <section class="secao"><h2>Lembrete de contacto</h2>${blocoLembrete(i)}</section>

  <section class="secao">
    <h2>Histórico</h2>
    <ol class="historico">
      ${[...i.historico].reverse().map((h) => `<li><span class="ponto ponto-${h.status}" aria-hidden="true"></span>${STATUS[h.status].nome}<time>${dataHora(h.em)}</time></li>`).join('')}
    </ol>
  </section>

  <section class="secao">
    <button class="botao botao-secundario" data-acao="alternar" data-alvo="form-editar">${icone('lapis')} Corrigir nome, contacto ou plano</button>
    <form id="form-editar" class="formulario formulario-caixa" data-id="${i.id}" hidden novalidate autocomplete="off">
      ${camposCliente(i)}
      ${opcoesPlano(i.plano)}
      <button class="botao botao-primario" type="submit">Guardar alterações</button>
    </form>
    <button class="botao botao-perigo" data-acao="apagar" data-id="${i.id}">Apagar indicação</button>
  </section>`;
}
