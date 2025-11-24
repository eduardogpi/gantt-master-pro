# Gantt Master Pro

Sistema avançado de gerenciamento de **Ações** e cronogramas via Gráfico de Gantt, focado em alocação de recursos, detecção de conflitos e rastreabilidade de alterações.

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

## 🛠️ Tecnologias
*   React
*   Vite
*   Ant Design (UI)
*   Tailwind CSS (Estilização)
*   Dnd-kit (Drag and Drop)
*   Day.js (Manipulação de Datas)
