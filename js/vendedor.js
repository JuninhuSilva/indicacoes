// Envio dos dados do cliente ao vendedor por WhatsApp.
import { PLANOS } from './config.js';
import { soDigitos } from './ui.js';

const CHAVE = 'indicacoes:vendedor';

export function lerVendedor() {
  try { return localStorage.getItem(CHAVE) || ''; } catch { return ''; }
}

export function guardarVendedor(numero) {
  try { localStorage.setItem(CHAVE, numero); } catch { /* armazenamento indisponível */ }
}

// Número no formato internacional exigido pelo WhatsApp (sem + nem espaços)
export function numeroWhatsApp(tel) {
  let d = soDigitos(tel).replace(/^\+/, '').replace(/^00/, '');
  if (/^9\d{8}$/.test(d)) d = `351${d}`; // telemóvel português sem indicativo
  return d;
}

export function mensagemVendedor(i) {
  const p = PLANOS[i.plano];
  return [
    '*Indicação de cliente*',
    `Nome: ${i.nome}`,
    i.telefone ? `Contacto: ${i.telefone}` : null,
    `Plano: ${p.nome} (${p.descricao})`,
    i.notas ? `Notas: ${i.notas}` : null,
  ].filter(Boolean).join('\n');
}

// Com número do vendedor guardado, abre a conversa dele; sem número, o WhatsApp pede para escolher o contacto.
export function linkVendedor(i, vendedor) {
  const texto = encodeURIComponent(mensagemVendedor(i));
  const num = numeroWhatsApp(vendedor);
  return num ? `https://wa.me/${num}?text=${texto}` : `https://wa.me/?text=${texto}`;
}
