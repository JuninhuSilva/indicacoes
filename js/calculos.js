// Cálculos puros (sem DOM): resumo do painel, lembretes e datas.
import { PLANOS, STATUS, HORA_LEMBRETE } from './config.js';

export function resumo(lista) {
  const porStatus = Object.fromEntries(Object.keys(STATUS).map((k) => [k, 0]));
  const porPlano = Object.fromEntries(Object.keys(PLANOS).map((k) => [k, { total: 0, fechadas: 0, abertas: 0, recebido: 0 }]));
  let recebido = 0;
  let previsto = 0;
  for (const i of lista) {
    const c = PLANOS[i.plano].comissao;
    const pp = porPlano[i.plano];
    porStatus[i.status]++;
    pp.total++;
    if (i.status === 'fechado') { recebido += c; pp.fechadas++; pp.recebido += c; }
    else if (STATUS[i.status].aberto) { previsto += c; pp.abertas++; }
  }
  return { total: lista.length, porStatus, porPlano, recebido, previsto };
}

export const lembretePendente = (i) => !!(i.lembrete && !i.lembrete.feito && STATUS[i.status].aberto);

export const lembretesPendentes = (lista) =>
  lista.filter(lembretePendente).sort((a, b) => a.lembrete.quando.localeCompare(b.lembrete.quando));

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
