import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';

dayjs.locale('pt-br');

export const initialMockData = [
    {
        id: 600,
        actionName: 'Sistema de Autenticação',
        originalStartDate: dayjs().startOf('week'),
        originalFinalDate: dayjs().add(3, 'week'),
        startDate: dayjs().startOf('week'),
        finalDate: dayjs().add(3, 'week'),
        developers: [{ name: 'Wemerson', role: 'Tech Lead' }],
        percent: 45,
        dependencies: [],
        status: 'in_progress',
        impacts: [],
        children: [
            {
                id: 101,
                actionName: 'Módulo Auth - Backend',
                originalStartDate: dayjs().startOf('week'),
                originalFinalDate: dayjs().add(1, 'week'),
                startDate: dayjs().startOf('week'),
                finalDate: dayjs().add(1, 'week'),
                developers: [{ name: 'Wemerson', role: 'Backend' }],
                percent: 100,
                dependencies: [],
                status: 'concluded',
                impacts: [],
                activities: [
                    {
                        id: 1,
                        title: 'Configuração do Banco de Dados',
                        status: 'done',
                        evidence: [
                            { name: 'schema.sql', type: 'sql' },
                            { name: 'diagrama_er.png', type: 'image' }
                        ]
                    },
                    {
                        id: 2,
                        title: 'Implementação da API de Login',
                        status: 'done',
                        evidence: [
                            { name: 'api_docs.json', type: 'json' },
                            { name: 'test_results.pdf', type: 'pdf' }
                        ]
                    },
                    {
                        id: 3,
                        title: 'Integração com JWT',
                        status: 'done',
                        evidence: []
                    }
                ],
                children: []
            },
            {
                id: 102,
                actionName: 'Módulo Auth - Frontend',
                originalStartDate: dayjs().add(1, 'week').add(2, 'day'),
                originalFinalDate: dayjs().add(2, 'week').add(3, 'day'),
                startDate: dayjs().add(1, 'week').add(2, 'day'),
                finalDate: dayjs().add(2, 'week').add(3, 'day'),
                developers: [{ name: 'Leonardo', role: 'Frontend' }],
                percent: 0,
                dependencies: [101], // Depende do Backend (ID 101)
                status: 'pending',
                impacts: [],
                children: []
            }
        ]
    },
    {
        id: 456,
        actionName: 'Ação AgendaAC4',
        originalStartDate: dayjs().startOf('week'),
        originalFinalDate: dayjs().add(2, 'month'),
        startDate: dayjs().startOf('week'),
        finalDate: dayjs().add(2, 'month'),
        developers: [{ name: 'Wemerson', role: 'Backend' }],
        percent: 60,
        dependencies: [],
        status: 'in_progress',
        impacts: [],
        children: []
    },
    {
        id: 438,
        actionName: 'Ação Siggo',
        originalStartDate: dayjs().add(1, 'month'),
        originalFinalDate: dayjs().add(3, 'month'),
        startDate: dayjs().add(1, 'month'),
        finalDate: dayjs().add(3, 'month'),
        developers: [{ name: 'Wemerson', role: 'Backend' }, { name: 'Ana', role: 'Design' }],
        percent: 30,
        dependencies: [456],
        status: 'pending',
        impacts: [],
        children: []
    }
];
