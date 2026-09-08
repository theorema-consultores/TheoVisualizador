import { unzipSync } from 'fflate';

const MAX_JSON_FILES = 500;
const MAX_JSON_BYTES = 10 * 1024 * 1024;

export function openArchive(bytes) {
  let entries;
  try {
    entries = unzipSync(bytes);
  } catch {
    throw new Error('Não foi possível abrir o ZIP.');
  }
  const names = Object.keys(entries).filter(name => !name.startsWith('__MACOSX/'));
  const jsonNames = names.filter(name => /\.json$/i.test(name));
  const jsonBytes = jsonNames.reduce((total, name) => total + entries[name].byteLength, 0);
  if (jsonNames.length > MAX_JSON_FILES || jsonBytes > MAX_JSON_BYTES) {
    throw new Error('O conteúdo JSON ultrapassa o limite permitido.');
  }
  const metadata = names.filter(name => name === 'visualizacao.json');
  if (metadata.length !== 1) throw new Error('O ZIP deve conter visualizacao.json na raiz.');

  const ensure = path => {
    const value = entries[path];
    if (!value) throw new Error(`O arquivo ${path} não foi encontrado no ZIP.`);
    return value;
  };
  const readText = path => {
    try {
      return new TextDecoder('utf-8', { fatal: true }).decode(ensure(path)).replace(/^\uFEFF/, '');
    } catch (error) {
      if (error instanceof Error && /não foi encontrado/.test(error.message)) throw error;
      throw new Error(`O arquivo ${path} não está em UTF-8 válido.`);
    }
  };

  return Object.freeze({
    listEntries: () => names.map(name => ({ path: name, size: entries[name].byteLength, type: /\.json$/i.test(name) ? 'json' : 'other' })),
    findByBasename: basename => names.filter(name => name.split('/').at(-1).toLocaleLowerCase('pt-BR') === basename.toLocaleLowerCase('pt-BR')),
    readBytes: path => new Uint8Array(ensure(path)),
    readText,
    readJson: path => {
      try { return JSON.parse(readText(path)); }
      catch (error) {
        if (error instanceof Error && /UTF-8|não foi encontrado/.test(error.message)) throw error;
        throw new Error(`O arquivo ${path} não contém JSON válido.`);
      }
    }
  });
}
