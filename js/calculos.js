// Cálculos puros (sem DOM): resumo do painel, lembretes, instalações e datas.
// Regra de pagamento: a comissão só conta como recebida a partir do dia da instalação.
import { PLANOS, STATUS, HORA_LEMBRETE, HORA_INSTALACAO } from './config.js';

const hh = (h) => String(h).padStart(2, '0');

// Data/hora da notificação de instalação (ISO) ou null
export const quandoInstalacao = (i) =>
  i.instalacao?.data ? new Date(`${i.instalacao.data}T${hh(HORA_INSTALACAO)}:00`).toISOString() : null;

export const instalado = (i, agora = Date.now()) =>
  i.status === 'fechado' && !!i.instalacao?.data && new Date(`${i.instalacao.data}T00:00`).getTime() <= agora;

export const aguardaInstalacao = (i, agora = Date.now()) => i.status === 'fechado' && !instalado(i, agora);

export function resumo(lista, agora = Date.now()) {
  const porStatus = Object.fromEntries(Object.keys(STATUS).map((k) => [k, 0]));
  const porPlano = Object.fromEntries(Object.keys(PLANOS).map((k) => [k, { total: 0, instaladas: 0, abertas: 0, recebido: 0 }]));
  let recebido = 0;
  let aReceber = 0;
  let previsto = 0;
  let instaladas = 0;
  for (const i of lista) {
    const c = PLANOS[i.plano].comissao;
    const pp = porPlano[i.plano];
    porStatus[i.status]++;
    pp.total++;
    if (instalado(i, agora)) { recebido += c; instaladas++; pp.instaladas++; pp.recebido += c; }
    else if (i.status === 'fechado') { aReceber += c; pp.abertas++; }
    else if (STATUS[i.status].aberto) { previsto += c; pp.abertas++; }
  }
  return { total: lista.length, porStatus, porPlano, recebido, aReceber, previsto, instaladas };
}

export const lembretePendente = (i) => !!(i.lembrete && !i.lembrete.feito && STATUS[i.status].aberto);

export const lembretesPendentes = (lista) =>
  lista.filter(lembretePendente).sort((a, b) => a.lembrete.quando.localeCompare(b.lembrete.quando));

// Fechadas à espera de instalação: com data primeiro (mais próxima), sem data no fim
export const instalacoesPendentes = (lista, agora = Date.now()) =>
  lista.filter((i) => aguardaInstalacao(i, agora))
    .sort((a, b) => (a.instalacao?.data || '9999').localeCompare(b.instalacao?.data || '9999'));

export const vencido = (i, agora = Date.now()) => new Date(i.lembrete.quando).getTime() <= agora;

// modo: 'prazo' (dias a contar de agora) ou 'data' (dia + hora escolhidos)
export function calcularQuando({ modo, dias, data, hora }) {
  let d;
  if (modo === 'prazo') {
    d = new Date();
    d.setDate(d.getDate() + Number(dias));
    d.setHours(HORA_LEMBRETE, 0, 0, 0);
  } else {
    const [h, m] = (hora || `${HORA_LEMBRETE}:00`).split(':').map(Number);
    d = new Date(`${data}T00:00`);
    d.setHours(h, m, 0, 0);
  }
  return d.toISOString();
}

export function adiar(quandoIso, dias) {
  const agora = Date.now();
  const base = new Date(Math.max(agora, new Date(quandoIso).getTime()));
  const estavaVencido = new Date(quandoIso).getTime() <= agora;
  base.setDate(base.getDate() + dias);
  if (estavaVencido) base.setHours(HORA_LEMBRETE, 0, 0, 0);
  return base.toISOString();
}
