import {
  IconChartBar,
  IconChecklist,
  IconClock,
  IconLayoutKanban,
  IconListDetails,
  IconRocket,
  IconRoute,
  IconSettings,
  IconSparkles,
  IconTarget,
  IconTimeline,
  IconUsers,
  type Icon,
} from '@tabler/icons-react'

// The training and help content. Plain data: paragraphs, bullet lists,
// numbered steps and tips, rendered by help-page.tsx. Keep it in step with
// what the system does; it is the users' manual.

export type Block = string | { list: string[] } | { steps: string[] } | { tip: string }

export type HelpItem = { q: string; a: Block[] }

export type HelpTopic = {
  id: string
  title: string
  description: string
  icon: Icon
  items: HelpItem[]
}

export const topics: HelpTopic[] = [
  {
    id: 'primeiros-passos',
    title: 'Primeiros passos',
    description: 'O que é o Nexa Flow e como se orientar na primeira vez.',
    icon: IconRocket,
    items: [
      {
        q: 'O que é o Nexa Flow?',
        a: [
          'O Nexa Flow organiza o trabalho dos times em projetos. Cada projeto tem um ou mais boards com colunas, e o trabalho anda pelo board na forma de cards (tarefas, histórias e bugs).',
          'Ele serve tanto para o trabalho contínuo (Kanban) quanto para o trabalho em ciclos (Scrum, com sprints), e também para uma mistura dos dois (Híbrido).',
        ],
      },
      {
        q: 'Como o sistema está organizado?',
        a: [
          {
            list: [
              'Projetos: o trabalho de um produto, cliente ou área. Cada projeto tem uma chave curta (ex.: NEXA) que vira o número dos cards (NEXA-12).',
              'Boards: o quadro com as colunas por onde os cards passam. Um projeto pode ter vários (ex.: Desenvolvimento e Suporte).',
              'Cards: cada item de trabalho. Têm responsáveis, estimativa, prazo, checklist, comentários, anexos e histórico.',
              'Backlog e sprints: o planejamento em ciclos, nos projetos Scrum ou Híbridos.',
              'Relatórios: horas registradas, estimado vs real e qualidade.',
            ],
          },
        ],
      },
      {
        q: 'Onde fica cada coisa na tela?',
        a: [
          {
            list: [
              'Sidebar (à esquerda): Projetos, Fila de testes, Exportações, Notificações, seus projetos recentes e, para administradores, a Administração.',
              'Barra do topo: busca de cards (Ctrl K), o timer em andamento, o status do sistema, o sino de notificações e o seu perfil.',
              'Dentro de um projeto: as abas Board, Backlog e sprints, Casos de teste, Relatórios e Configurações.',
            ],
          },
          { tip: 'O botão de menu no topo recolhe a sidebar para ganhar espaço no board.' },
        ],
      },
      {
        q: 'Como encontro um card rapidamente?',
        a: [
          'Use a busca do topo ou o atalho Ctrl K (⌘K no Mac). Dá para buscar pelo título ou pela chave (ex.: NEXA-12). A busca olha todos os projetos em que você participa.',
          'No board, o campo "Filtrar por título ou número" e os filtros (responsável, tag, prioridade, departamento, prazo, tipo e severidade) refinam o que aparece. Os filtros ficam no endereço da página, então dá para compartilhar o link já filtrado.',
        ],
      },
    ],
  },
  {
    id: 'metodologias',
    title: 'Kanban, Scrum ou Híbrido',
    description: 'Qual escolher e o que muda no sistema em cada um.',
    icon: IconRoute,
    items: [
      {
        q: 'O que é Kanban e quando usar?',
        a: [
          'Kanban é trabalho em fluxo contínuo: os cards entram, andam pelas colunas e saem prontos, sem ciclos fixos. O foco é manter o fluxo andando e evitar acúmulo em cada etapa.',
          'Use quando a demanda chega aos poucos e com prioridades que mudam: suporte, operação, manutenção, atendimento a áreas internas.',
          {
            list: [
              'No Nexa Flow, um projeto Kanban mostra só o Board (não há a aba Backlog e sprints).',
              'O limite de WIP (trabalho em andamento) de cada coluna ajuda a não começar mais coisas do que o time termina.',
            ],
          },
        ],
      },
      {
        q: 'O que é Scrum e quando usar?',
        a: [
          'Scrum organiza o trabalho em sprints: ciclos curtos (normalmente de 1 a 4 semanas) com um objetivo. No início o time escolhe o que cabe na sprint, durante a sprint executa, e no fim revisa o que foi entregue.',
          'Use quando o time desenvolve um produto com entregas planejadas e quer previsibilidade.',
          {
            list: [
              'No Nexa Flow, o projeto Scrum tem a aba Backlog e sprints para planejar, iniciar e encerrar sprints.',
              'O board abre filtrado pela sprint ativa: o time vê só o compromisso do ciclo.',
              'Cada sprint tem um burndown e um relatório de encerramento.',
            ],
          },
        ],
      },
      {
        q: 'E o Híbrido?',
        a: [
          'O Híbrido usa sprints para planejar, mas o board mostra todos os cards por padrão, inclusive os que não estão em sprint. É bom para times que trabalham em ciclos e também recebem demandas avulsas (ex.: um time de produto que também atende bugs urgentes).',
          {
            tip: 'Em qualquer projeto com sprints, o seletor "Sprint ativa / Todos os cards" no topo do board alterna entre as duas visões.',
          },
        ],
      },
      {
        q: 'Posso trocar a metodologia depois?',
        a: [
          'Sim. Em Configurações → Geral, o gestor do projeto troca a metodologia a qualquer momento. Nada é perdido: cards, sprints e histórico continuam lá; muda só o que as telas mostram por padrão.',
        ],
      },
    ],
  },
  {
    id: 'projetos',
    title: 'Projetos e papéis',
    description: 'Criar projetos, convidar pessoas e o que cada papel pode fazer.',
    icon: IconUsers,
    items: [
      {
        q: 'Como crio um projeto?',
        a: [
          {
            steps: [
              'Em Projetos, clique em "Novo projeto".',
              'Dê um nome e confira a chave sugerida (2 a 10 letras ou números). A chave não muda depois, porque está no número de todos os cards.',
              'Escolha a metodologia (Kanban, Scrum ou Híbrido) e a estimativa exibida nos cards (story points ou horas).',
              'Se o time tem QA, marque "Fluxo de QA": o board já nasce com a coluna "Em teste" e só deixa concluir cards aprovados.',
            ],
          },
          'Quem cria o projeto vira o gestor dele.',
        ],
      },
      {
        q: 'Quais são os papéis num projeto e o que cada um pode fazer?',
        a: [
          {
            list: [
              'Gestor: tudo no projeto, inclusive configurações, membros, boards, colunas e regras.',
              'Product Owner (PO): prioriza o backlog, planeja e conduz sprints, cria e edita cards e valida entregas.',
              'Desenvolvedor: cria, edita e move cards, registra tempo e comenta.',
              'QA: o mesmo que o desenvolvedor, mais validar cards (aprovar ou reprovar), cuidar dos casos de teste e dos itens de QA do checklist.',
              'Processos: acompanha, registra tempo, comenta e vê os relatórios de todo o time.',
              'Visualizador: só leitura.',
            ],
          },
          'Desenvolvedores e QA veem nos relatórios de horas apenas as próprias horas; Gestor, PO e Processos veem as de todos.',
        ],
      },
      {
        q: 'Como adiciono pessoas ao projeto?',
        a: [
          'Em Configurações → Membros. Dá para adicionar pessoas uma a uma, com um papel, ou vincular um time inteiro: todos do time recebem o papel escolhido. Se alguém está nos dois jeitos, vale o papel direto.',
          'O projeto precisa ter sempre pelo menos um gestor.',
        ],
      },
      {
        q: 'O que acontece quando arquivo um projeto?',
        a: [
          'O projeto vira somente leitura: ninguém cria, edita ou move cards até ser desarquivado. Ele vai para o fim da lista de projetos, e o histórico continua disponível.',
        ],
      },
    ],
  },
  {
    id: 'boards',
    title: 'Boards e colunas',
    description: 'Como o board funciona, as categorias das colunas, WIP e regras.',
    icon: IconLayoutKanban,
    items: [
      {
        q: 'O que é o board?',
        a: [
          'É o quadro do projeto: cada coluna é uma etapa do trabalho e cada card é um item. Arraste os cards entre as colunas (ou use o teclado) conforme o trabalho avança. No celular, o board mostra uma coluna por vez, escolhida no seletor.',
        ],
      },
      {
        q: 'Posso ver os cards de outro jeito além do quadro?',
        a: [
          'Sim. No topo do board, escolha a visão:',
          {
            list: [
              'Quadro: as colunas lado a lado, para arrastar os cards.',
              'Lista: uma tabela agrupada por coluna, com prioridade, responsáveis, estimativa, prazo e subtarefas. Dá para ordenar por prioridade, prazo ou número. Boa para revisar muitos cards de uma vez.',
              'Calendário: os cards no dia do prazo, mês a mês, na cor da coluna. Os atrasados ficam em vermelho. Bom para ver semanas carregadas e entregas próximas.',
            ],
          },
          'Os filtros e o seletor de sprint valem para as três visões. O sistema lembra a última visão de cada projeto.',
        ],
      },
      {
        q: 'Posso mudar a cor das colunas?',
        a: [
          'Sim. Em Configurações → Colunas, escolha a cor de cada coluna. Ela aparece numa faixa no topo da coluna, na lista e no calendário. Sem cor escolhida, a coluna usa a cor da categoria (ex.: Em andamento em amarelo, Concluído em verde).',
        ],
      },
      {
        q: 'Para que serve a categoria de cada coluna?',
        a: [
          'O nome da coluna é livre, mas a categoria diz ao sistema o que ela significa. É a categoria que alimenta relatórios, sprints e regras:',
          {
            list: [
              'Backlog: ideias e itens ainda não priorizados.',
              'A fazer: pronto para começar.',
              'Em andamento: alguém está trabalhando.',
              'Revisão: aguardando revisão (ex.: code review).',
              'Em teste: aguardando ou em validação do QA. Esses cards formam a Fila de testes.',
              'Concluído: entregue. Conta como feito na sprint e nos relatórios.',
              'Bloqueado: parado por algum impedimento.',
            ],
          },
        ],
      },
      {
        q: 'O que é o limite de WIP?',
        a: [
          'WIP (work in progress) é o máximo de cards que uma coluna deve ter ao mesmo tempo. Quando passa do limite, o contador da coluna fica vermelho. Para impedir de fato a entrada, crie a regra "Respeitar o limite de WIP" na aba Regras.',
          {
            tip: 'Limitar o WIP força o time a terminar antes de começar coisas novas, o que reduz o tempo de entrega.',
          },
        ],
      },
      {
        q: 'Posso ter mais de um board no projeto?',
        a: [
          'Sim. Em Configurações → Boards, o gestor cria boards (cada um com as colunas padrão), renomeia, escolhe o board padrão (o que abre ao entrar no projeto) e exclui boards vazios. Com mais de um board, aparece um seletor no topo do board, e o card ganha o campo Board para ser levado de um board ao outro.',
        ],
      },
      {
        q: 'O que são as regras de transição?',
        a: [
          'São condições para um card mudar de coluna, configuradas por board em Configurações → Regras. Se alguma falha, o card volta para o lugar e aparece o que falta. Os tipos de regra:',
          {
            list: [
              'Campos obrigatórios: exige story points, estimativa, prazo, descrição, responsável, tag ou departamento.',
              'Checklist completo: todos os itens (ou só os de QA, ou só os gerais) marcados.',
              'Só certos papéis movem: ex.: só o QA leva o card para Concluído.',
              'Respeitar o limite de WIP da coluna de destino.',
              'Aprovado pelo QA: a última revisão do QA aprovou o card.',
              'Sem bug aberto: nenhum bug encontrado no card está aberto (a partir de uma severidade).',
              'Casos de teste aprovados: todos os casos anexados passaram na rodada atual.',
            ],
          },
          'Cada regra vale "de" uma coluna "para" outra; "qualquer coluna" vale para todas.',
        ],
      },
    ],
  },
  {
    id: 'cards',
    title: 'Cards',
    description: 'Criar, preencher e acompanhar o trabalho em cada card.',
    icon: IconListDetails,
    items: [
      {
        q: 'Como crio um card?',
        a: [
          'No board, clique em "Adicionar card" no pé da coluna, escreva o título e pressione Enter. Marque "É um bug" para criar um bug. Depois clique no card para preencher o resto.',
        ],
      },
      {
        q: 'O que significa cada campo do card?',
        a: [
          {
            list: [
              'Prioridade: Baixa, Média, Alta ou Urgente. Alta e Urgente aparecem destacadas no board.',
              'Story points e Estimativa (h): duas formas independentes de estimar (veja "Story points e estimativas").',
              'Prazo: a data limite. Cards atrasados aparecem em vermelho, e o sistema lembra os responsáveis na véspera e quando atrasa.',
              'Responsáveis: quem está fazendo. Recebem as notificações do card.',
              'Tags: rótulos livres do projeto (e as globais, definidas pela administração).',
              'Departamentos: de onde veio a demanda (Origem), para quem é (Destino) e quem mais participa (Envolvido).',
              'Sprint: em qual sprint o card está (projetos com sprints).',
            ],
          },
        ],
      },
      {
        q: 'Como crio subtarefas?',
        a: [
          'No card, em "Subtarefas", clique em "Nova subtarefa". Cada subtarefa é um card completo, com coluna, responsável, tempo e QA próprios, ligado ao card pai. A seção mostra quantas já foram concluídas, e o card pai mostra o progresso no board.',
          'Uma subtarefa pode ter as próprias subtarefas. Exemplo:',
          {
            list: [
              'História "Login por e-mail" → subtarefas "Front" e "Backend".',
              'Abra "Backend" e crie as dele: "Endpoint de callback", "Vincular conta", "Testes".',
            ],
          },
          'Para mudar um card de lugar na árvore, use o campo "Card pai" no próprio card. Deixar em branco o torna um card principal.',
          {
            tip: 'Use subtarefas para dividir um trabalho grande entre pessoas ou áreas. Para passos curtos que a mesma pessoa faz, o checklist é mais simples.',
          },
        ],
      },
      {
        q: 'Como funcionam checklist, comentários e anexos?',
        a: [
          {
            list: [
              'Checklist: passos do card. O progresso aparece no board. Itens marcados como "QA" só podem ser alterados por QA, PO ou gestor.',
              'Comentários: aceitam formatação e menções com @nome. Quem é mencionado é avisado e passa a seguir o card.',
              'Anexos: arquivos de até 25 MB, enviados direto do navegador.',
              'Histórico: tudo o que aconteceu com o card, de quem criou a cada mudança.',
            ],
          },
        ],
      },
      {
        q: 'O que é "seguir" um card?',
        a: [
          'Quem segue um card recebe notificação dos novos comentários. Quem cria o card já começa seguindo; use o botão Seguir / Deixar de seguir no rodapé do card.',
        ],
      },
      {
        q: 'E se duas pessoas editarem o mesmo card ao mesmo tempo?',
        a: [
          'O sistema percebe: quem salvar por último recebe o aviso de que outra pessoa alterou o card, vê a versão atual e refaz a alteração. Nada é sobrescrito sem querer. O board também se atualiza sozinho, em tempo real, com o que os outros fazem.',
        ],
      },
      {
        q: 'Excluí um card por engano. Perdi?',
        a: [
          'O card sai do board, mas o número e o histórico ficam guardados (a exclusão é lógica). Peça a um administrador se precisar recuperar o conteúdo pela auditoria.',
        ],
      },
    ],
  },
  {
    id: 'backlog-sprints',
    title: 'Backlog e sprints',
    description: 'Planejar, iniciar, acompanhar e encerrar sprints.',
    icon: IconTarget,
    items: [
      {
        q: 'O que é o backlog?',
        a: [
          'É a lista de tudo que ainda precisa ser feito e não está numa sprint. Na aba Backlog e sprints ele aparece abaixo das sprints, com os cards sem sprint que ainda não foram concluídos. O PO (ou o gestor) mantém o backlog priorizado: o mais importante no topo.',
        ],
      },
      {
        q: 'Como planejo uma sprint?',
        a: [
          {
            steps: [
              'Em Backlog e sprints, clique em "Nova sprint" e informe nome, objetivo, início e fim.',
              'No backlog, use "Mover para" em cada card para colocá-lo na sprint.',
              'Confira os totais da sprint (cards, pontos e horas) para não passar da capacidade do time.',
              'Clique em "Iniciar" quando o time estiver pronto. Só uma sprint fica em andamento por vez.',
            ],
          },
          {
            tip: 'Um bom objetivo de sprint é uma frase que explica o valor do ciclo, por exemplo: "clientes conseguem recuperar a senha sozinhos".',
          },
        ],
      },
      {
        q: 'Posso adicionar cards depois que a sprint começou?',
        a: [
          'Pode. O card entra marcado como "entrou depois do início". Isso aparece no relatório da sprint e faz a linha do burndown subir, mostrando que o escopo cresceu.',
        ],
      },
      {
        q: 'Como leio o burndown?',
        a: [
          'O burndown mostra, dia a dia, quanto falta terminar na sprint (em pontos ou horas). A linha cinza é o ideal: sair do total no primeiro dia e chegar a zero no último. A linha colorida é o real.',
          {
            list: [
              'Real acima do ideal: o time está atrasado em relação ao plano.',
              'Real abaixo do ideal: o time está adiantado.',
              'Linha subindo: entrou escopo novo na sprint.',
              'Linha reta por vários dias: nada foi concluído (vale investigar impedimentos).',
            ],
          },
        ],
      },
      {
        q: 'O que acontece quando encerro a sprint?',
        a: [
          'O sistema registra como cada card terminou: concluído, passou para a próxima sprint ou voltou ao backlog. Para os não concluídos, você escolhe o destino (o backlog ou uma sprint planejada). O relatório da sprint guarda o compromisso inicial, o que entrou depois, o que foi concluído e o tempo registrado.',
        ],
      },
    ],
  },
  {
    id: 'story-points',
    title: 'Story points e estimativas',
    description: 'O que são pontos, como estimar e quando usar horas.',
    icon: IconSparkles,
    items: [
      {
        q: 'O que são story points?',
        a: [
          'Story points medem o tamanho relativo de um card: quanto esforço, complexidade e incerteza ele tem comparado aos outros. Não são horas: um card de 5 pontos é "mais ou menos o dobro" de um de 3, não "5 horas".',
          'A vantagem é que o time estima mais rápido e com mais acerto comparando cards entre si do que adivinhando horas.',
        ],
      },
      {
        q: 'Que escala usar?',
        a: [
          'A mais comum é a de Fibonacci: 1, 2, 3, 5, 8, 13. Os saltos crescem porque, quanto maior o card, maior a incerteza. O Nexa Flow aceita também meio ponto (0,5) para itens muito pequenos.',
          {
            tip: 'Card de 13 ou mais costuma ser grande demais para uma sprint: quebre em cards menores (dá para ligar os filhos ao card pai).',
          },
        ],
      },
      {
        q: 'Como o time estima na prática?',
        a: [
          {
            steps: [
              'Escolham um card já conhecido como referência (ex.: "isso é um 3").',
              'Para cada card novo, cada pessoa escolhe um valor da escala em segredo.',
              'Revelem juntos. Se houver diferença grande, quem deu o menor e o maior explicam o porquê.',
              'Votem de novo até convergir e registrem o valor no campo Story points.',
            ],
          },
          'Esse método é conhecido como planning poker.',
        ],
      },
      {
        q: 'Pontos ou horas? Posso usar os dois?',
        a: [
          'Pode. Os dois campos são independentes e um não converte no outro. Em Configurações → Geral, a "Estimativa exibida" escolhe qual aparece nos cards do board; o burndown e os relatórios mostram os dois.',
          {
            list: [
              'Pontos: bons para planejar sprints e acompanhar o ritmo do time.',
              'Horas: boas para trabalho que se cobra ou se compara com o tempo registrado (o relatório "Estimado vs real" usa horas).',
            ],
          },
        ],
      },
      {
        q: 'Como sei quantos pontos cabem numa sprint?',
        a: [
          'Olhe as últimas sprints encerradas: a média de pontos concluídos por sprint é a capacidade (ou velocidade) do time. Planeje a próxima perto desse número, ajustando para férias e feriados.',
        ],
      },
    ],
  },
  {
    id: 'tempo',
    title: 'Registro de tempo',
    description: 'Timer, lançamentos manuais e o que acontece com timers esquecidos.',
    icon: IconClock,
    items: [
      {
        q: 'Como registro o tempo de um card?',
        a: [
          {
            list: [
              'Timer: no card, clique em "Iniciar timer". Ele aparece no topo da tela, em todas as abas, até você pausar ou parar.',
              'Pausar: fecha o lançamento e guarda o card para você retomar depois.',
              'Parar: fecha o lançamento e esquece o card.',
              'Manual: em "Lançar manualmente", informe a duração (1h30, 1:30, 1,5 ou 90m), o dia e, se quiser, a hora de início e uma nota.',
            ],
          },
          'Cada pessoa tem um timer por vez: iniciar outro pausa o atual.',
        ],
      },
      {
        q: 'Quais as regras do lançamento manual?',
        a: [
          'O lançamento manual registra tempo já trabalhado, então:',
          {
            list: [
              'Ele precisa terminar até agora: não dá para lançar tempo no futuro.',
              'Cada lançamento vai de 1 minuto até 24 horas. Para mais, lance cada dia separado.',
              'Sem hora de início, um lançamento de hoje termina agora (ex.: 2h lançadas às 15:00 ficam das 13:00 às 15:00), e um de outro dia começa às 09:00.',
            ],
          },
          'Antes de lançar, o formulário mostra exatamente o que será registrado (dia e horário) ou o motivo de não dar.',
        ],
      },
      {
        q: 'E se eu esquecer o timer ligado?',
        a: [
          'Com 8 horas ligado, você recebe um aviso. Com 12 horas, o sistema para o timer sozinho e registra isso no histórico. Corrija o lançamento no card se precisar.',
        ],
      },
    ],
  },
  {
    id: 'qa',
    title: 'Qualidade (QA)',
    description: 'Fila de testes, aprovação, bugs e casos de teste.',
    icon: IconChecklist,
    items: [
      {
        q: 'Como funciona o fluxo de QA?',
        a: [
          {
            steps: [
              'Quem desenvolve leva o card para a coluna "Em teste".',
              'O card aparece na Fila de testes de quem valida (QA, PO e gestor).',
              'O QA testa: executa os casos de teste anexados e o checklist de QA.',
              'Se está certo: "Aprovar" ou "Aprovar e concluir" (já leva para Concluído).',
              'Se não: "Reprovar" com o motivo. O card volta para "Em andamento", os responsáveis são avisados e começa uma nova rodada de testes.',
            ],
          },
          'Para ligar o fluxo, marque "Fluxo de QA" ao criar o projeto ou use "Ativar fluxo de QA" em Configurações → Boards.',
        ],
      },
      {
        q: 'O que coloca um card na Fila de testes?',
        a: [
          'Estar numa coluna da categoria "Em teste", ainda sem aprovação, num projeto ativo em que você pode validar. O card sai da fila quando é aprovado, reprovado ou movido para outra coluna. Com "Aprovar" (sem concluir), ele continua na coluna "Em teste" até alguém movê-lo, mas já não aparece na fila.',
          'A fila mostra primeiro quem espera há mais tempo. O "em teste desde" é a hora em que o card entrou na coluna desta vez: se ele foi reprovado e voltou, conta a partir da volta.',
        ],
      },
      {
        q: 'Como reporto um bug?',
        a: [
          'No card que está sendo testado, em "Bugs encontrados", clique em "Reportar bug" e preencha severidade, ambiente, passos para reproduzir, resultado esperado e obtido. O bug é criado em "A fazer", ligado ao card e atribuído aos mesmos responsáveis.',
          {
            list: [
              'Severidade Crítica: o sistema para ou há perda de dados. Vira prioridade Urgente.',
              'Alta: uma função importante não funciona. Vira prioridade Alta.',
              'Média: funciona com contorno ou parcialmente.',
              'Baixa: cosmético ou incômodo pequeno.',
            ],
          },
          {
            tip: 'A regra "Sem bug aberto" impede concluir um card enquanto houver bug aberto nele (a partir da severidade escolhida).',
          },
        ],
      },
      {
        q: 'O que são os casos de teste e as rodadas?',
        a: [
          'Casos de teste são roteiros reutilizáveis (pré-condições e passos com o resultado esperado), mantidos na aba Casos de teste do projeto. No card, o QA anexa os casos que se aplicam e marca cada um como passou, falhou ou bloqueado. Uma falha pode gerar um bug já preenchido com os passos do caso.',
          'Cada reprovação do card começa uma rodada nova: os casos voltam a ficar pendentes e o resultado da rodada anterior aparece ao lado, para comparar.',
        ],
      },
    ],
  },
  {
    id: 'relatorios',
    title: 'Relatórios',
    description: 'Horas, estimado vs real, qualidade e exportações.',
    icon: IconChartBar,
    items: [
      {
        q: 'Quais relatórios existem?',
        a: [
          {
            list: [
              'Horas: tempo registrado no período, por pessoa, card, sprint ou dia.',
              'Estimado vs real: compara a estimativa em horas com o tempo gasto, com os maiores estouros primeiro.',
              'Qualidade: taxa de reprovação, aprovação de primeira, retrabalho, tempo em teste, bugs e casos de teste, por semana e por sprint.',
              'Sprint: na aba Backlog e sprints, o burndown e o resultado de cada sprint.',
            ],
          },
          'Os filtros (período e sprint) ficam no endereço da página, então um relatório pode ser compartilhado como link.',
        ],
      },
      {
        q: 'Como leio o relatório de qualidade?',
        a: [
          {
            list: [
              'Taxa de reprovação: das revisões do QA, quantas foram reprovações. Quanto menor, melhor.',
              'Aprovação de primeira: cards aprovados sem nenhuma reprovação antes. Quanto maior, melhor.',
              'Retrabalho médio: quantas vezes, em média, um card volta do QA antes de ser aprovado.',
              'Tempo em teste: quanto tempo os cards ficam esperando ou em validação.',
              'Tempo para corrigir bug: da criação do bug até ele chegar a Concluído.',
            ],
          },
          'Os números são sempre do projeto, do time ou da sprint, nunca por pessoa.',
        ],
      },
      {
        q: 'Como exporto um relatório?',
        a: [
          'Use os botões Excel ou CSV no topo do relatório. O arquivo é gerado em segundo plano; você é avisado quando fica pronto e baixa em Exportações (sidebar). Os arquivos ficam disponíveis por 24 horas.',
        ],
      },
    ],
  },
  {
    id: 'notificacoes-admin',
    title: 'Notificações e administração',
    description: 'O que você recebe, como configurar e o que a administração cuida.',
    icon: IconSettings,
    items: [
      {
        q: 'Quando recebo notificações?',
        a: [
          {
            list: [
              'Quando outra pessoa te atribui um card ou te menciona num comentário.',
              'Quando comentam num card que você segue.',
              'Na véspera do prazo e quando um card seu atrasa (às 8h).',
              'Quando seu card é aprovado ou reprovado pelo QA (vale para os responsáveis; sem responsáveis, para quem segue o card).',
              'Quando o timer fica ligado muito tempo e quando uma exportação fica pronta.',
            ],
          },
          'Você nunca é notificado do que você mesmo fez: se você se atribui um card ou comenta no seu próprio card, nada chega. Para testar, peça a outra pessoa para fazer a ação.',
          'No sistema, a notificação aparece na hora como um aviso no canto da tela e no sino do topo, com o número das não lidas. Em Notificações (sidebar), escolha por tipo se quer receber no sistema, por e-mail ou nos dois.',
          {
            tip: 'Os e-mails só saem se a administração configurou o servidor de e-mail (Administração → E-mail (SMTP)).',
          },
        ],
      },
      {
        q: 'O que a administração cuida?',
        a: [
          {
            list: [
              'Usuários: cadastro, papel no sistema (Administrador ou Usuário), departamento e desativação.',
              'Departamentos e Times: os times agrupam pessoas para vincular a projetos de uma vez.',
              'Tags globais: tags que aparecem em todos os projetos.',
              'E-mail (SMTP): o servidor por onde saem as notificações por e-mail e os links de redefinição de senha.',
              'Auditoria: o registro de tudo o que foi feito no sistema, que não pode ser alterado nem apagado.',
            ],
          },
          'Administradores têm acesso a todos os projetos.',
        ],
      },
      {
        q: 'Esqueci minha senha. E agora?',
        a: [
          'Na tela de login, clique em "Esqueci minha senha" e informe seu e-mail: chega um link válido por 1 hora para definir uma nova. Se o e-mail não chegar, peça a um administrador.',
          'O acesso é sempre com e-mail e senha. Quem é cadastrado sem senha inicial define a sua pelo "Esqueci minha senha".',
        ],
      },
      {
        q: 'Como configuro o envio de e-mails?',
        a: [
          'Em Administração → E-mail (SMTP), um administrador informa os dados do servidor do provedor de e-mail (Gmail, Outlook, Brevo, Resend, o da empresa...):',
          {
            list: [
              'Servidor e porta: por exemplo, smtp.gmail.com e 587.',
              'Conexão TLS direta: ligada para a porta 465; desligada para a 587.',
              'Usuário e senha: a conta que envia. No Gmail e no Outlook, use uma senha de app.',
              'Remetente: como aparece para quem recebe, por exemplo Nexa Flow <no-reply@empresa.com.br>. Muitos provedores exigem o mesmo e-mail do usuário.',
            ],
          },
          'Depois de salvar, use "Enviar e-mail de teste". Se o servidor recusar, a mensagem de erro dele aparece na tela. A senha fica criptografada e nunca é exibida de novo: para mantê-la ao editar, deixe o campo em branco.',
          {
            tip: 'Sem servidor configurado, o sistema funciona normalmente, mas nenhum e-mail é enviado (nem notificações, nem redefinição de senha).',
          },
        ],
      },
    ],
  },
  {
    id: 'fluxo-completo',
    title: 'O fluxo completo, do início ao fim',
    description: 'Um exemplo do caminho de uma história no Nexa Flow.',
    icon: IconTimeline,
    items: [
      {
        q: 'Como uma história anda pelo sistema, do pedido à entrega?',
        a: [
          {
            steps: [
              'Pedido: alguém cria o card no Backlog com título, descrição e o departamento de origem.',
              'Refinamento: o PO detalha, prioriza e o time estima em story points.',
              'Planejamento: na criação da sprint, o card entra na sprint ("Mover para").',
              'Execução: o desenvolvedor se atribui, leva o card para "Em andamento", liga o timer e usa o checklist.',
              'Revisão: quando termina o código, leva para "Revisão" para outra pessoa revisar.',
              'Teste: depois, leva para "Em teste". O card entra na Fila de testes.',
              'Validação: o QA executa os casos de teste. Se algo falha, reporta o bug e reprova; o card volta para "Em andamento" e o ciclo repete.',
              'Entrega: aprovado, o QA usa "Aprovar e concluir" e o card vai para "Concluído".',
              'Fechamento: no fim da sprint, o PO encerra a sprint e o time olha o burndown e o relatório de qualidade para melhorar o próximo ciclo.',
            ],
          },
          {
            tip: 'Em Kanban o caminho é o mesmo, só sem a etapa de sprint: o card sai do backlog direto para "A fazer" quando o time tem capacidade.',
          },
        ],
      },
    ],
  },
]

export const topicById = (id: string | undefined) => topics.find((topic) => topic.id === id)
