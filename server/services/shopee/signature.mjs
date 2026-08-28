import { createHash } from 'node:crypto';

/**
 * Assinatura da Shopee Affiliate Open API (documentação oficial):
 *
 *   Signature = SHA256(AppId + Timestamp + Payload + Secret)
 *
 * - AppId:     SHOPEE_APP_ID
 * - Timestamp: Unix em SEGUNDOS (janela de ~5 minutos)
 * - Payload:   body exato (string JSON) enviado na requisição
 * - Secret:    SHOPEE_SECRET (NUNCA logado nem enviado ao frontend)
 *
 * Header resultante:
 *   Authorization: SHA256 Credential={appId}, Timestamp={ts}, Signature={sig}
 */

/**
 * @param {{ appId: string, timestamp: string|number, payload: string, secret: string }} p
 * @returns {string} assinatura hex lowercase
 */
export function buildSignature({ appId, timestamp, payload, secret }) {
  return createHash('sha256')
    .update(`${appId}${timestamp}${payload}${secret}`, 'utf8')
    .digest('hex');
}

/**
 * @param {{ appId: string, secret: string, payload: string, timestamp?: number }} p
 * @returns {{ timestamp: number, header: string }} header pronto para uso.
 *          ATENÇÃO: o header contém material derivado do secret — nunca logar.
 */
export function buildAuthorizationHeader({
  appId,
  secret,
  payload,
  timestamp = Math.floor(Date.now() / 1000),
}) {
  const signature = buildSignature({ appId, timestamp, payload, secret });
  return {
    timestamp,
    header: `SHA256 Credential=${appId}, Timestamp=${timestamp}, Signature=${signature}`,
  };
}
