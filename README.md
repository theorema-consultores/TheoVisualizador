# Theo Visualizador

Site estático para abrir uma emissão Betha e direcioná-la ao dashboard indicado pelo ZIP.

## Entrada

Abra a página publicada com um protocolo público:

```text
https://usuario.github.io/repositorio/?protocolo=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

O protocolo é mantido somente na sessão da aba para permitir atualização da página e é retirado da URL após a transferência para o dashboard.

## Contrato do ZIP

O ZIP deve possuir `visualizacao.json` na raiz:

```json
{
  "schemaVersion": "1.0.0",
  "dashboard": {
    "id": "balancete-receita",
    "version": "1.0.0"
  }
}
```

O dashboard de Balancete localiza seu próprio `balancete-receita.json` em qualquer subpasta do ZIP.

## Desenvolvimento

```powershell
npm install
npm test
npm run check
npm run build
npm run dev
```

Não publique ZIPs ou dados de relatório no repositório. O GitHub Actions executa testes, build e publicação no GitHub Pages após push para `main`.
