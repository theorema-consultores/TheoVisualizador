# Theo Visualizador

Visualizador de emissões Betha com shell único, navegação entre visualizações e dashboards montáveis.

## Entrada

Abra a página publicada com um protocolo público:

```text
https://usuario.github.io/repositorio/?protocolo=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

O protocolo é usado apenas na entrada. Após a transferência, a URL canônica volta para `/` e a sessão da aba mantém o ZIP e o dashboard para permitir atualização sem expor o nome do relatório. Sem protocolo ou sessão ativa, a raiz exibe o campo para informar um protocolo.

O shell usa abas horizontais para até quatro visualizações. A partir de cinco, o seletor muda para um dropdown nativo. O tema claro/escuro pode ser alternado no nav e a preferência fica salva localmente.

## Contrato do ZIP

O ZIP deve possuir `visualizacao.json` na raiz. Ele pode conter uma visualização ou um array de visualizações:

```json
{
  "schemaVersion": "1.0.0",
  "dashboard": {
    "id": "balancete-receita",
    "version": "1.0.0"
  }
}
```

```json
[
  { "schemaVersion": "1.0.0", "dashboard": { "id": "balancete-receita", "version": "1.0.0" } },
  { "schemaVersion": "1.0.0", "dashboard": { "id": "balancete-receita", "version": "1.0.0" } }
]
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
