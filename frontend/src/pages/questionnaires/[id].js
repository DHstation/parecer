import { useRouter } from 'next/router';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { questionnaires } from '../../services/api';
import { FaArrowLeft, FaEdit, FaTrash, FaCheckCircle, FaClock, FaExclamationTriangle, FaSave } from 'react-icons/fa';
import { useState } from 'react';
import toast from 'react-hot-toast';

export default function QuestionnaireDetails() {
  const router = useRouter();
  const { id } = router.query;
  const queryClient = useQueryClient();

  const [editingQuestion, setEditingQuestion] = useState(null);
  const [answerText, setAnswerText] = useState('');
  const [notes, setNotes] = useState('');

  // Buscar questionário
  const { data: questionnaireData, isLoading } = useQuery(
    ['questionnaire', id],
    () => questionnaires.get(id),
    { enabled: !!id }
  );

  // Mutation para responder pergunta
  const answerMutation = useMutation(
    ({ questionIndex, answer, notes }) =>
      questionnaires.answerQuestion(id, questionIndex, { answer, notes }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['questionnaire', id]);
        queryClient.invalidateQueries('questionnaires');
        setEditingQuestion(null);
        setAnswerText('');
        setNotes('');
        toast.success('Resposta salva!');
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Erro ao salvar resposta');
      }
    }
  );

  // Mutation para deletar questionário
  const deleteMutation = useMutation(
    () => questionnaires.delete(id),
    {
      onSuccess: () => {
        toast.success('Questionário excluído!');
        router.push('/questionnaires');
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Erro ao excluir questionário');
      }
    }
  );

  const handleEditQuestion = (index, question) => {
    setEditingQuestion(index);
    setAnswerText(question.answer || '');
    setNotes(question.notes || '');
  };

  const handleSaveAnswer = (questionIndex) => {
    if (!answerText.trim()) {
      toast.error('Digite uma resposta');
      return;
    }

    answerMutation.mutate({
      questionIndex,
      answer: answerText,
      notes: notes
    });
  };

  const handleCancelEdit = () => {
    setEditingQuestion(null);
    setAnswerText('');
    setNotes('');
  };

  const handleDelete = () => {
    if (confirm('Tem certeza que deseja excluir este questionário?')) {
      deleteMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const questionnaire = questionnaireData?.data;

  if (!questionnaire) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Questionário não encontrado</p>
          <button
            onClick={() => router.push('/questionnaires')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  const statusColors = {
    draft: 'bg-gray-100 text-gray-800',
    pending: 'bg-yellow-100 text-yellow-800',
    in_progress: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    archived: 'bg-gray-100 text-gray-600'
  };

  const statusLabels = {
    draft: 'Rascunho',
    pending: 'Pendente',
    in_progress: 'Em Andamento',
    completed: 'Concluído',
    archived: 'Arquivado'
  };

  const priorityColors = {
    low: 'bg-gray-100 text-gray-700',
    medium: 'bg-blue-100 text-blue-700',
    high: 'bg-orange-100 text-orange-700',
    critical: 'bg-red-100 text-red-700'
  };

  const priorityLabels = {
    low: 'Baixa',
    medium: 'Média',
    high: 'Alta',
    critical: 'Crítica'
  };

  const categoryLabels = {
    facts: 'Fatos',
    evidence: 'Provas',
    legal_basis: 'Base Legal',
    procedure: 'Procedimento',
    risks: 'Riscos',
    strategy: 'Estratégia',
    general: 'Geral'
  };

  const progress = questionnaire.progress || { total: 0, answered: 0, percentage: 0 };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center flex-1">
            <button
              onClick={() => router.push('/questionnaires')}
              className="mr-4 p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <FaArrowLeft className="text-gray-600" />
            </button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">{questionnaire.title}</h1>
              {questionnaire.description && (
                <p className="text-gray-600 mt-1">{questionnaire.description}</p>
              )}
            </div>
          </div>
          <button
            onClick={handleDelete}
            className="ml-4 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <FaTrash />
          </button>
        </div>

        {/* Status e Progresso */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-600 mb-2">Status</p>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusColors[questionnaire.status]}`}>
                {statusLabels[questionnaire.status]}
              </span>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-2">Progresso</p>
              <div className="flex items-center">
                <div className="flex-1 bg-gray-200 rounded-full h-2 mr-3">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${progress.percentage}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium text-gray-700">
                  {progress.answered}/{progress.total}
                </span>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-2">Caso</p>
              {questionnaire.caseId ? (
                <button
                  onClick={() => router.push(`/cases/${questionnaire.caseId._id}`)}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  {questionnaire.caseId.title}
                </button>
              ) : (
                <span className="text-sm text-gray-500">Não vinculado</span>
              )}
            </div>
          </div>
        </div>

        {/* Perguntas */}
        <div className="space-y-4">
          {questionnaire.questions?.map((question, index) => (
            <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden">
              {/* Cabeçalho da Pergunta */}
              <div className="bg-gray-50 px-6 py-4 border-b flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <span className="text-sm font-semibold text-gray-500 mr-3">
                      Pergunta {index + 1}
                    </span>
                    {question.priority && (
                      <span className={`text-xs px-2 py-1 rounded ${priorityColors[question.priority]}`}>
                        {priorityLabels[question.priority]}
                      </span>
                    )}
                    {question.category && (
                      <span className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-700 ml-2">
                        {categoryLabels[question.category] || question.category}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-900 font-medium">{question.question}</p>
                  {question.contextSource?.excerpt && (
                    <p className="text-sm text-gray-600 mt-2 italic">
                      Contexto: "{question.contextSource.excerpt.slice(0, 150)}..."
                    </p>
                  )}
                </div>
                {question.answer && editingQuestion !== index ? (
                  <FaCheckCircle className="text-green-600 ml-4 flex-shrink-0 mt-1" />
                ) : !question.answer ? (
                  <FaClock className="text-yellow-600 ml-4 flex-shrink-0 mt-1" />
                ) : null}
              </div>

              {/* Corpo da Pergunta */}
              <div className="p-6">
                {editingQuestion === index ? (
                  // Modo de Edição
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Resposta *
                      </label>
                      <textarea
                        value={answerText}
                        onChange={(e) => setAnswerText(e.target.value)}
                        rows={5}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Digite sua resposta..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Observações (opcional)
                      </label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Observações adicionais..."
                      />
                    </div>
                    <div className="flex justify-end space-x-3">
                      <button
                        onClick={handleCancelEdit}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                        disabled={answerMutation.isLoading}
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => handleSaveAnswer(index)}
                        disabled={answerMutation.isLoading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 flex items-center"
                      >
                        {answerMutation.isLoading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Salvando...
                          </>
                        ) : (
                          <>
                            <FaSave className="mr-2" />
                            Salvar
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : question.answer ? (
                  // Resposta Existente
                  <div>
                    <div className="mb-3">
                      <p className="text-sm font-medium text-gray-700 mb-1">Resposta:</p>
                      <p className="text-gray-900 whitespace-pre-wrap">{question.answer}</p>
                    </div>
                    {question.notes && (
                      <div className="mb-3">
                        <p className="text-sm font-medium text-gray-700 mb-1">Observações:</p>
                        <p className="text-gray-600 whitespace-pre-wrap text-sm">{question.notes}</p>
                      </div>
                    )}
                    {question.answeredAt && (
                      <p className="text-xs text-gray-500">
                        Respondido em {new Date(question.answeredAt).toLocaleString('pt-BR')}
                      </p>
                    )}
                    <button
                      onClick={() => handleEditQuestion(index, question)}
                      className="mt-3 text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center"
                    >
                      <FaEdit className="mr-1" />
                      Editar Resposta
                    </button>
                  </div>
                ) : (
                  // Sem Resposta
                  <div>
                    <p className="text-gray-500 mb-4">Esta pergunta ainda não foi respondida.</p>
                    <button
                      onClick={() => handleEditQuestion(index, question)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Responder
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {(!questionnaire.questions || questionnaire.questions.length === 0) && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <FaExclamationTriangle className="mx-auto text-yellow-500 text-4xl mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhuma pergunta encontrada
            </h3>
            <p className="text-gray-600">
              Este questionário não possui perguntas cadastradas.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
