// Notificações locais e lembretes.
// A verificação em si corre no service worker (sw.js), que lê a IndexedDB e mostra a notificação.
import { PLANOS, STATUS } from './config.js';
import { lembretePendente, quandoInstalacao } from './calculos.js';
import { descarregar } from './ui.js';

export const eIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
export const instalado = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

// 'granted' | 'default' | 'denied' | 'ios-navegador' | 'indisponivel'
export function estadoNotificacoes() {
  if (eIOS() && !instalado()) return 'ios-navegador';
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return 'indisponivel';
  return Notification.permission;
}

// Tem de ser chamada diretamente num toque do utilizador (antes de qualquer await).
export function pedirPermissao() {
  if (!('Notification' in window) || Notification.permission !== 'default') {
    return Promise.resolve(window.Notification?.permission || 'indisponivel');
  }
  return Notification.requestPermission().then((p) => {
    if (p === 'granted') registarVerificacaoPeriodica();
    return p;
  });
}

// Android/Chrome com app instalada: o sistema acorda o service worker de tempos a tempos.
export async function registarVerificacaoPeriodica() {
  try {
    const reg = await navigator.serviceWorker.ready;
    if (!('periodicSync' in reg)) return;
    const st = await navigator.permissions.query({ name: 'periodic-background-sync' });
    if (st.state === 'granted') await reg.periodicSync.register('lembretes', { minInterval: 60 * 60 * 1000 });
  } catch { /* não suportado */ }
}

export async function verificarAgora() {
  if (!('serviceWorker' in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    reg.active?.postMessage({ tipo: 'verificar' });
  } catch { /* sem service worker */ }
}

// Enquanto a app está aberta, dispara a verificação à hora exata do próximo lembrete.
let timer;
export function agendarProxima(lista) {
  clearTimeout(timer);
  const agora = Date.now();
  const futuros = [
    ...lista.filter(lembretePendente).map((i) => i.lembrete.quando),
    ...lista.filter((i) => i.status === 'fechado' && i.instalacao?.data && !i.instalacao.notificado).map(quandoInstalacao),
  ].map((q) => new Date(q).getTime()).filter((t) => t > agora);
  if (!futuros.length) return;
  const espera = Math.min(Math.min(...futuros) - agora + 1500, 2 ** 31 - 1);
  timer = setTimeout(verificarAgora, espera);
}

// Ficheiro .ics: cria um evento com alarme no calendário do telemóvel (alarme garantido).
// tipo: 'contacto' (lembrete para contactar) ou 'instalacao' (dia da instalação)
export function descarregarICS(i, tipo = 'contacto') {
  const f = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const e = (s) => String(s).replace(/\\/g, '\\\\').replace(/[;,]/g, (c) => `\\${c}`).replace(/\n/g, '\\n');
  const inst = tipo === 'instalacao';
  const ini = new Date(inst ? quandoInstalacao(i) : i.lembrete.quando);
  const fim = new Date(ini.getTime() + 15 * 60000);
  const p = PLANOS[i.plano];
  const titulo = inst ? `Instalação de ${i.nome} (${p.nome}, ${p.comissao} €)` : `Contactar ${i.nome} (${p.nome})`;
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Controlo de Indicacoes//PT', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${i.id}-${tipo}-${f(ini)}@indicacoes`,
    `DTSTAMP:${f(new Date())}`,
    `DTSTART:${f(ini)}`,
    `DTEND:${f(fim)}`,
    `SUMMARY:${e(titulo)}`,
    `DESCRIPTION:${e(`Contacto: ${i.telefone || 'sem contacto'}\nPlano: ${p.nome} (${p.comissao} €)\nStatus: ${STATUS[i.status].nome}${i.notas ? `\nNotas: ${i.notas}` : ''}`)}`,
    'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${e(titulo)}`, 'TRIGGER:-PT0M', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
  const nome = i.nome.replace(/[^\p{L}\d]+/gu, '-').toLowerCase();
  descarregar(ics, `${inst ? 'instalacao' : 'lembrete'}-${nome}.ics`, 'text/calendar;charset=utf-8');
}
