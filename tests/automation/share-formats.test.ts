import { describe, expect, it } from 'vitest';
import {
  createShareDestination,
  createShareJob,
  createSharePayload,
  isShareFormat,
  SHARE_FORMATS,
} from '../../src/automation/index.ts';
import {
  storySharePayload,
  validSharePayload,
  validSharePayloadInput,
} from './fixtures.ts';

describe('formatos suportados', () => {
  it('expõe exatamente group_message e story', () => {
    expect(SHARE_FORMATS).toEqual(['group_message', 'story']);
    expect(isShareFormat('group_message')).toBe(true);
    expect(isShareFormat('story')).toBe(true);
    expect(isShareFormat('email')).toBe(false);
  });
});

describe('formato group_message', () => {
  it('cria payload e job no formato de grupo', () => {
    const payload = validSharePayload({ targetFormat: 'group_message' });
    expect(payload.targetFormat).toBe('group_message');

    const job = createShareJob({
      destinationId: 'dest-grupo',
      payload,
    });

    expect(job.format).toBe('group_message');
    expect(job.payload.targetFormat).toBe('group_message');
    expect(job.status).toBe('pending');
  });

  it('destino whatsapp_group aceita group_message', () => {
    const destination = createShareDestination({
      name: 'Grupo Ofertas',
      channel: 'whatsapp_group',
      externalRef: 'grupo-ofertas-123',
    });

    expect(destination.supportedFormats).toContain('group_message');
    expect(destination.enabled).toBe(true);
    expect(destination.id).toMatch(/^dest_/);
  });

  it('mantém a copy multi-linha típica de grupo', () => {
    const payload = createSharePayload(
      validSharePayloadInput({ targetFormat: 'group_message' }),
    );
    expect(payload.generatedCopy.split('\n').length).toBeGreaterThan(1);
    expect(payload.affiliateUrl).toMatch(/^https:\/\//);
  });
});

describe('formato story', () => {
  it('cria payload e job no formato story', () => {
    const payload = storySharePayload();
    expect(payload.targetFormat).toBe('story');
    expect(payload.cta).toBe('Arrasta pra cima');

    const job = createShareJob({
      destinationId: 'dest-status',
      payload,
    });

    expect(job.format).toBe('story');
    expect(job.payload.targetFormat).toBe('story');
  });

  it('destino whatsapp_status aceita story', () => {
    const destination = createShareDestination({
      name: 'Status WhatsApp',
      channel: 'whatsapp_status',
      externalRef: 'status',
    });

    expect(destination.supportedFormats).toContain('story');
  });

  it('story mantém imagem gerada quando existe', () => {
    const payload = storySharePayload();
    expect(payload.generatedImageUrl).toMatch(/^https:\/\//);
  });
});

describe('preparação de destinos', () => {
  it('permite sobrescrever formatos suportados', () => {
    const destination = createShareDestination({
      name: 'Webhook Interno',
      channel: 'webhook',
      externalRef: 'https://example.com/hook',
      supportedFormats: ['story'],
    });

    expect(destination.supportedFormats).toEqual(['story']);
  });

  it('rejeita destino sem nome ou referência externa', () => {
    expect(() =>
      createShareDestination({
        name: '',
        channel: 'whatsapp_group',
        externalRef: 'x',
      }),
    ).toThrow(/name/i);

    expect(() =>
      createShareDestination({
        name: 'Grupo',
        channel: 'whatsapp_group',
        externalRef: '  ',
      }),
    ).toThrow(/externalRef/i);
  });
});
