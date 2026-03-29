import { 
  Scale, 
  HeartPulse, 
  Sparkles, 
  Utensils, 
  Building2, 
  GraduationCap, 
  Car, 
  ShoppingBag 
} from 'lucide-react';

export const sectors = [
  {
    id: 'juridico',
    name: 'Jurídico',
    icon: Scale,
    agents: [
      { id: 'civil', name: 'Direito Civil', description: 'Especialista em contratos e responsabilidade civil.' },
      { id: 'penal', name: 'Direito Penal', description: 'Especialista em defesa criminal e processos penais.' },
      { id: 'trabalho', name: 'Direito do Trabalho', description: 'Especialista em relações de emprego e CLT.' },
      { id: 'tributario', name: 'Direito Tributário', description: 'Especialista em impostos e planejamento fiscal.' },
      { id: 'familia', name: 'Direito de Família', description: 'Especialista em divórcios, guarda e inventários.' },
      { id: 'previdenciario', name: 'Direito Previdenciário', description: 'Especialista em aposentadorias e benefícios INSS.' },
      { id: 'imobiliario_jur', name: 'Direito Imobiliário', description: 'Especialista em escrituras e registros de imóveis.' },
      { id: 'propriedade_intelectual', name: 'Propriedade Intelectual', description: 'Especialista em marcas e patentes.' },
    ]
  },
  {
    id: 'saude',
    name: 'Saúde',
    icon: HeartPulse,
    agents: [
      { id: 'recepcionista_medica', name: 'Recepcionista Médica', description: 'Agendamento e triagem de pacientes.' },
      { id: 'odontologia', name: 'Assistente Odontológico', description: 'Suporte para clínicas dentárias.' },
      { id: 'nutricao', name: 'Consultor de Nutrição', description: 'Orientação nutricional e dietas.' },
      { id: 'fisioterapia', name: 'Triagem de Fisioterapia', description: 'Avaliação inicial e exercícios.' },
      { id: 'exames', name: 'Agendador de Exames', description: 'Gestão de laboratórios e diagnósticos.' },
    ]
  },
  {
    id: 'estetica',
    name: 'Estética',
    icon: Sparkles,
    agents: [
      { id: 'estetica_avancada', name: 'Estética Avançada', description: 'Consultoria em procedimentos estéticos.' },
      { id: 'salao', name: 'Salão de Beleza', description: 'Agendamento de cortes e tratamentos.' },
      { id: 'spa', name: 'Spa e Relaxamento', description: 'Gestão de massagens e terapias.' },
      { id: 'barbearia', name: 'Barbearia Moderna', description: 'Estilo e agendamento para homens.' },
    ]
  },
  {
    id: 'gastronomia',
    name: 'Gastronomia',
    icon: Utensils,
    agents: [
      { id: 'pizzaria', name: 'Atendente de Pizzaria', description: 'Pedidos e delivery de pizzas.' },
      { id: 'restaurante', name: 'Recepcionista de Restaurante', description: 'Reservas e atendimento de mesa.' },
      { id: 'hamburgueria', name: 'Hamburgueria Gourmet', description: 'Personalização de pedidos de burgers.' },
      { id: 'sommelier', name: 'Sommelier Digital', description: 'Harmonização de vinhos e bebidas.' },
      { id: 'cafeteria', name: 'Atendente de Cafeteria', description: 'Pedidos de cafés e lanches.' },
    ]
  },
  {
    id: 'imobiliario',
    name: 'Imobiliário',
    icon: Building2,
    agents: [
      { id: 'corretor_residencial', name: 'Corretor Residencial', description: 'Venda e compra de casas e aptos.' },
      { id: 'gestor_locacao', name: 'Gestor de Aluguéis', description: 'Administração de aluguéis.' },
      { id: 'lancamentos', name: 'Lançamentos Imobiliários', description: 'Venda de imóveis na planta.' },
    ]
  },
  {
    id: 'educacao',
    name: 'Educação',
    icon: GraduationCap,
    agents: [
      { id: 'tutor_idiomas', name: 'Tutor de Idiomas', description: 'Prática de conversação e gramática.' },
      { id: 'matriculas', name: 'Assistente de Matrículas', description: 'Informações sobre cursos e escolas.' },
      { id: 'cursos_online', name: 'Consultor de Cursos Online', description: 'Venda e suporte de infoprodutos.' },
    ]
  },
  {
    id: 'automotivo',
    name: 'Automotivo',
    icon: Car,
    agents: [
      { id: 'oficina', name: 'Oficina Mecânica', description: 'Orçamentos e agendamento de revisão.' },
      { id: 'estetica_automotiva', name: 'Estética Automotiva', description: 'Detalhamento e lavagem técnica.' },
    ]
  },
  {
    id: 'varejo',
    name: 'Varejo',
    icon: ShoppingBag,
    agents: [
      { id: 'personal_shopper', name: 'Personal Shopper', description: 'Consultoria de moda e estilo.' },
      { id: 'suplementos', name: 'Consultor de Suplementos', description: 'Dicas de treino e nutrição esportiva.' },
      { id: 'suporte_tecnico', name: 'Suporte de Eletrônicos', description: 'Ajuda com gadgets e tecnologia.' },
    ]
  }
];
