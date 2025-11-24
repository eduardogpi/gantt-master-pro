import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';

dayjs.locale('pt-br');

export const initialMockData = [
    {
        id: 600,
        actionName: 'Sistema de Autenticação',
        originalStartDate: dayjs('2025-08-01'),
        originalFinalDate: dayjs('2025-08-25'),
        startDate: dayjs('2025-08-01'),
        finalDate: dayjs('2025-08-25'),
        developers: [{ name: 'Wemerson', role: 'Tech Lead' }],
        percent: 45,
        dependencies: [],
        status: 'in_progress',
        impacts: [],
        children: [
            {
                id: 101,
                actionName: 'Módulo Auth - Backend',
                originalStartDate: dayjs('2025-08-01'),
                originalFinalDate: dayjs('2025-08-10'),
                startDate: dayjs('2025-08-01'),
                finalDate: dayjs('2025-08-10'),
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
                originalStartDate: dayjs('2025-08-15'),
                originalFinalDate: dayjs('2025-08-25'),
                startDate: dayjs('2025-08-15'),
                finalDate: dayjs('2025-08-25'),
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
        originalStartDate: dayjs('2025-08-01'),
        originalFinalDate: dayjs('2025-11-15'),
        startDate: dayjs('2025-08-01'),
        finalDate: dayjs('2025-11-15'),
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
        originalStartDate: dayjs('2025-09-15'),
        originalFinalDate: dayjs('2025-11-10'),
        startDate: dayjs('2025-09-15'),
        finalDate: dayjs('2025-11-10'),
        developers: [{ name: 'Wemerson', role: 'Backend' }, { name: 'Ana', role: 'Design' }],
        percent: 30,
        dependencies: [456],
        status: 'pending',
        impacts: [],
        children: []
    }
];
