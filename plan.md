# Bootstrap NPM Multi-Plataforma

## Objetivo

Desenvolver um pacote NPM capaz de configurar automaticamente um ambiente de desenvolvimento de acordo com o sistema operacional detectado.

O pacote deve funcionar em Linux, Windows e macOS sem qualquer interação do usuário durante a detecção do sistema operacional.

A execução deverá ocorrer através de:

```bash
npm start
```

ou

```bash
npx <nome-do-pacote>
```

---

# Requisitos

## 1. Detecção automática do sistema operacional

A detecção deve utilizar exclusivamente as APIs nativas do Node.js.

Utilizar:

```javascript
require("node:os").platform()
```

Mapeamento:

| Retorno | Sistema |
|----------|----------|
| linux | Linux |
| win32 | Windows |
| darwin | macOS |

Não utilizar prompts ao usuário.

Não solicitar confirmação.

Não utilizar valores hardcoded para decidir o sistema operacional.

---

## 2. Arquitetura

Organizar o projeto da seguinte maneira:

```
.
├── package.json
├── README.md
├── index.js
├── installers/
│   ├── linux.js
│   ├── windows.js
│   ├── macos.js
│   └── common.js
├── utils/
│   ├── detect.js
│   ├── exec.js
│   └── logger.js
└── config/
    ├── linux.json
    ├── windows.json
    └── macos.json
```

---

# Fluxo esperado

```
Início

↓

Detectar sistema operacional

↓

Linux?
        sim → installers/linux.js

↓

Windows?
        sim → installers/windows.js

↓

macOS?
        sim → installers/macos.js

↓

Executar instalação

↓

Fim
```

---

# Responsabilidades

## detect.js

Responsável apenas por retornar:

```javascript
{
    platform: "linux"
}
```

ou

```javascript
{
    platform: "windows"
}
```

ou

```javascript
{
    platform: "macos"
}
```

Não executar instalações.

---

## index.js

Responsável por:

- detectar o sistema
- carregar o instalador correto
- iniciar o processo

Não deve possuir lógica de instalação.

---

## installers/

Cada instalador será independente.

Exemplo:

Linux

- apt
- dnf
- pacman
- zypper

Windows

- winget
- powershell

macOS

- brew

Cada arquivo deve exportar apenas uma função:

```javascript
module.exports = async function install() {

}
```

---

# Execução de comandos

Criar um helper:

```
utils/exec.js
```

Exemplo de interface:

```javascript
await exec("sudo apt update");
```

ou

```javascript
await exec("winget install Git.Git");
```

Esse helper deverá:

- executar comandos
- capturar stdout
- capturar stderr
- lançar exceções quando necessário

---

# Configuração

Cada sistema operacional terá um arquivo JSON.

Exemplo:

linux.json

```json
{
    "packages": [
        "git",
        "curl",
        "zsh",
        "tmux",
        "docker.io"
    ]
}
```

windows.json

```json
{
    "packages": [
        "Git.Git",
        "Microsoft.PowerShell",
        "Docker.DockerDesktop"
    ]
}
```

macos.json

```json
{
    "packages": [
        "git",
        "zsh",
        "tmux",
        "docker"
    ]
}
```

Os instaladores deverão consumir apenas esses arquivos.

Nenhuma lista de pacotes deverá estar hardcoded no código.

---

# Logging

Criar um logger simples.

Exemplo:

```
[INFO]
```

```
[WARN]
```

```
[ERROR]
```

```
[SUCCESS]
```

Todo output deve passar pelo logger.

---

# package.json

Criar:

```json
{
    "scripts": {
        "start": "node index.js"
    }
}
```

Também disponibilizar:

```json
"bin": {
    "bootstrap": "./index.js"
}
```

para permitir:

```bash
npx bootstrap
```

---

# Boas práticas

- Código modular.
- Funções pequenas.
- Sem duplicação.
- Async/await.
- Tratamento de erros.
- Compatível com Node.js LTS.
- Utilizar apenas módulos nativos do Node.js quando possível.

---

# Objetivo final

Ao executar:

```bash
npm start
```

o pacote deverá:

1. Detectar automaticamente o sistema operacional.
2. Carregar o instalador correspondente.
3. Ler o arquivo de configuração daquele sistema.
4. Executar as instalações necessárias.
5. Exibir logs claros durante toda a execução.

Toda a lógica de decisão deve ser baseada apenas na detecção do sistema operacional fornecida pela API nativa do Node.js (`os.platform()`), sem interação com o usuário.
