# Gantt Master Pro

Sistema avançado de gerenciamento de **Ações** e cronogramas via Gráfico de Gantt, focado em alocação de recursos, detecção de conflitos e rastreabilidade de alterações.

## 🚀 Novidades da Versão 1.1

### ✨ Melhorias de Código e Arquitetura
- **Custom Hooks Extraídos:** `useGanttHistory` (undo/redo), `useKeyboardShortcuts` (atalhos), `useIsMobile` (detecção de tela)
- **Modais Componentizados:** 7 modais extraídos para componentes independentes em `src/components/Modals/`
- **Handlers Memoizados:** `useCallback` aplicado nos handlers principais para evitar re-renders
- **Limpeza de Código:** Remoção de imports e estados não utilizados

### 📱 Responsividade Aprimorada
- **3 Breakpoints:** Mobile (< 768px), Tablet (768-1024px), Desktop (> 1024px)
- **Header Adaptativo:** Layout otimizado para cada tamanho de tela sem sobreposição
- **Modais Fullscreen:** Modais ocupam tela inteira em dispositivos móveis
- **Touch Targets Maiores:** Áreas de toque expandidas (72px) para melhor usabilidade mobile
- **Altura de Barras Dinâmica:** Desktop 36px, Mobile 44px

### 🎯 Experiência Touch Melhorada
- **Tap Rápido:** Abre popover com ações rápidas (Editar, Excluir, Tarefa Avulsa)
- **Toque Longo (500ms):** Abre modal de detalhes completo
- **Sem Conflito de Eventos:** Separação clara entre gestos de tap e long press

### 📍 Indicadores de Scroll
- **Gradientes nas Bordas:** Indicam visualmente que há mais conteúdo
- **Barra de Progresso:** Mini scrollbar horizontal e vertical mostrando posição atual
- **Botões de Navegação:** Setas direcionais (←→↑↓) para scroll rápido

### ⌨️ Atalhos de Teclado
| Atalho | Ação |
|--------|------|
| `Ctrl+Z` | Desfazer |
| `Ctrl+Y` / `Ctrl+Shift+Z` | Refazer |
| `Ctrl+S` | Salvar alterações |
| `Ctrl+N` | Nova ação |
| `Escape` | Fechar modal ativo |

### 🎨 Interface do Menu (Drawer)
- **Quick Actions:** Botões grandes (48px) com gradiente de destaque
- **Zoom com Botões:** Controle +/- além do slider
- **Footer Informativo:** Versão + contador de itens visíveis
- **Dark Mode Toggle:** Disponível no header do drawer

---

## 📋 Regras de Negócio

### 1. Agendamento e Movimentação (Drag & Drop)
*   **Bloqueio de Retrocesso:** Não é permitido mover uma ação que está agendada para o futuro para uma data anterior ao dia atual ("Hoje"). O sistema impede operações que violem a integridade temporal histórica.
*   **Justificativa de Atraso:** Qualquer movimentação que adie o término de uma ação (mover para a direita) dispara automaticamente um modal de auditoria. O usuário é obrigado a fornecer um motivo e detalhes para o atraso.
*   **Propagação de Atrasos (Cascata):** Ao adiar uma ação que possui dependências, o sistema ajusta automaticamente todos os itens dependentes, mantendo a consistência do cronograma.

### 2. Gestão de Recursos e Conflitos
*   **Limite de Concorrência:** O sistema monitora a carga de trabalho de cada desenvolvedor. Por padrão, um desenvolvedor pode atuar em até **2 ações simultâneas**.
*   **Detecção Automática:** Se um desenvolvedor for alocado em mais ações do que o limite no mesmo período, as ações envolvidas são marcadas visualmente como "Em Conflito" (Cor Laranja).
*   **Resolução de Conflitos:** Ao adicionar novas tarefas, o sistema verifica a disponibilidade do responsável no intervalo de datas escolhido. Se houver colisão com outras ações, um alerta é exibido antes da confirmação.

### 3. Tarefas Avulsas e Impacto
Tarefas menores podem ser inseridas dentro de uma ação principal com dois comportamentos distintos:
*   **Modo Concorrente (Paralelo):** A tarefa é realizada simultaneamente à ação, sem alterar a data final da entrega principal.
*   **Modo Impacto (Inteligente):**
    *   A tarefa é inserida e o sistema identifica **subtarefas específicas** do desenvolvedor responsável que colidem com o novo período.
    *   Essas subtarefas são adiadas automaticamente.
    *   **Cascata Interna:** O atraso é propagado para outras subtarefas dependentes dentro da mesma ação.
    *   **Preservação de Concluídos:** Tarefas já concluídas (`100%` ou `concluded`) **não são afetadas** pelo impacto, garantindo a integridade do histórico realizado.

### 4. Auditoria e Controle
*   **Histórico de Alterações (Undo/Redo):** Todas as operações (edição, movimentação, exclusão) são registradas em uma pilha de histórico, permitindo desfazer (Undo) e refazer (Redo) ações a qualquer momento durante a sessão.
*   **Resumo de Alterações (Save):** Antes de persistir os dados, o sistema gera um relatório detalhado ("Diff") comparando o estado atual com o último estado salvo. O relatório identifica:
    *   Novas ações criadas.
    *   Ações removidas.
    *   Alterações de datas (Início/Fim).
    *   Mudanças de prioridade (Reordenação vertical).
    *   Novos impactos ou tarefas adicionadas.

### 5. Visualização e Interface
*   **Zoom Dinâmico:** A escala do tempo pode ser ajustada para visualizar detalhes diários, semanais ou mensais.
*   **Alternância de Modos (Switch):**
    *   **Cronograma:** Focado no ajuste temporal (datas).
    *   **Prioridade:** Focado no ajuste de importância (reordenar linhas verticalmente).
*   **Caminho Crítico:** Visualização opcional que destaca tarefas que impactam diretamente o prazo final.
*   **Dark Mode:** Interface moderna com tema escuro definido como **padrão**, com suporte a alternância para tema claro.
*   **Menu Unificado:** Botões de criação ("Nova Ação", "Nova Tarefa", "Tarefa Avulsa") agrupados em um menu dropdown intuitivo para melhor organização.

### 6. Mobile & Responsividade
*   **Layout Adaptativo:** Interface otimizada para diferentes tamanhos de tela (Mobile, Tablet, Desktop), com menu lateral (Drawer) em dispositivos menores.
*   **Interações Touch Inteligentes:** 
    *   Tap rápido para ações contextuais (Popover)
    *   Toque longo para detalhes completos (Modal)
*   **Header Responsivo:** Elementos se adaptam e reorganizam conforme o espaço disponível, sem sobreposição.
*   **Tipografia Responsiva:** Ajuste automático de fontes e espaçamentos para garantir legibilidade em telas pequenas.

---

## 🛠️ Tecnologias
*   React 18+
*   Vite 7
*   Ant Design 5 (UI)
*   Tailwind CSS 3 (Estilização)
*   Dnd-kit (Drag and Drop)
*   Day.js (Manipulação de Datas)

## 📁 Estrutura do Projeto

```
src/
├── components/
│   ├── Gantt/           # Componentes do gráfico
│   │   ├── TaskBar.jsx
│   │   ├── DraggableRow.jsx
│   │   ├── ScrollControls.jsx
│   │   └── ...
│   └── Modals/          # Modais extraídos
│       ├── NewTaskModal.jsx
│       ├── EditActionModal.jsx
│       └── ...
├── hooks/               # Custom hooks
│   ├── useGanttHistory.js
│   ├── useKeyboardShortcuts.js
│   ├── useIsMobile.js
│   └── index.js
├── constants/           # Configurações
│   └── config.js
├── utils/               # Funções utilitárias
│   └── ganttUtils.js
└── GanttMasterPro.jsx   # Componente principal
```

## 🚀 Como Executar

```bash
# Instalar dependências
npm install

# Desenvolvimento
npm run dev

# Build de produção
npm run build

# Preview do build
npm run preview
```
