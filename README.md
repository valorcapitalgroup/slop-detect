# Bootstrap NPM Multi-Plataforma

Um pacote NPM para configurar automaticamente um ambiente de desenvolvimento baseado no sistema operacional detectado.

## Características

- **Detecção automática de SO** usando `require("node:os").platform()` (Linux, Windows, macOS)
- **Sem interação do usuário** - detecção e instalação totalmente automatizadas
- **Execução via `npm start` ou `npx bootstrap-dev-env`**
- **Arquitetura modular** com instaladores específicos por SO
- **Suporte a múltiplos gerenciadores de pacotes** por SO

## Instalação

```bash
npm install bootstrap-dev-env
# ou
npx bootstrap-dev-env
```

## Uso

```bash
npm start
# ou
npx bootstrap-dev-env
```

## Sistemas Operacionais Suportados

| Sistema | `os.platform()` | Gerenciadores de Pacotes Suportados |
|---------|----------------|------------------------------------|
| Linux   | `linux`        | apt, dnf, pacman, zypper, apk     |
| Windows | `win32`        | winget, chocolatey, scoop         |
| macOS   | `darwin`       | homebrew                          |

## Arquitetura

```
.
├── package.json
├── index.js              # Entry point
├── installers/
│   ├── linux.js          # Instalador Linux (apt/dnf/pacman/zypper/apk)
│   ├── windows.js        # Instalador Windows (winget/choco/scoop)
│   ├── macos.js          # Instalador macOS (homebrew)
│   └── common.js         # Lógica compartilhada
├── utils/
│   ├── detect.js         # Detecção de SO via node:os
│   ├── exec.js           # Helper para execução de comandos
│   └── logger.js         # Logger colorido
└── config/
    ├── linux.json        # Pacotes para Linux
    ├── windows.json      # Pacotes para Windows
    └── macos.json        # Pacotes para macOS
```

## Configuração de Pacotes

Edite os arquivos em `config/` para personalizar os pacotes instalados:

```json
{
  "packages": ["git", "nodejs", "docker", "vscode"]
}
```

## Execução via NPX

```bash
npx bootstrap-dev-env
```

O pacote detectará automaticamente o SO e instalará os pacotes configurados.

## Requisitos

- Node.js >= 18.0.0
- Permissões de administrador/sudo para instalação de pacotes
- Gerenciador de pacotes instalado (apt, winget, homebrew, etc.)

## Licença

MIT