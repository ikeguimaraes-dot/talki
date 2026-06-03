import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '../supabase';
import type { CommentWithMember, TaskWithAssignees, TeamMember, Bucket } from '../types';

const LABEL_COLORS = [
  '#E53935', '#E91E63', '#9C27B0', '#1565C0', '#00838F',
  '#2E7D32', '#558B2F', '#F9A825', '#E65100', '#4E342E',
];

interface TaskDetailsModalProps {
  taskId: string;
  teamMembers: TeamMember[];
  onClose: () => void;
  currentUserId?: string;
}

export const TaskDetailsModal: React.FC<TaskDetailsModalProps> = ({ taskId, teamMembers, onClose, currentUserId }) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const commentListRef = useRef<HTMLDivElement>(null);

  const [task, setTask] = useState<TaskWithAssignees | null>(null);
  const [comments, setComments] = useState<CommentWithMember[]>([]);
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [bucketId, setBucketId] = useState('');
  const [status, setStatus] = useState<'Não iniciado' | 'Em andamento' | 'Concluído'>('Não iniciado');
  const [priority, setPriority] = useState<'Baixa' | 'Média' | 'Alta' | 'Urgente'>('Média');
  const [labelText, setLabelText] = useState('');
  const [labelColor, setLabelColor] = useState(LABEL_COLORS[0]);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [saveLoading, setSaveLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [commentText, setCommentText] = useState('');
  const [selectedAuthorId, setSelectedAuthorId] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);

  const fetchTaskDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .select(`
          *,
          assignees:task_assignees(
            member:team_members(*)
          )
        `)
        .eq('id', taskId)
        .single();

      if (taskError) throw taskError;

      const formattedTask: TaskWithAssignees = {
        ...taskData,
        assignees: taskData.assignees
          ? taskData.assignees.map((a: any) => a.member).filter(Boolean)
          : []
      };
      setTask(formattedTask);

      setTitle(formattedTask.title || '');
      setDescription(formattedTask.description || '');
      setStartDate(formattedTask.start_date || '');
      setDueDate(formattedTask.due_date || '');
      setBucketId(formattedTask.bucket_id || '');
      setStatus(formattedTask.status || 'Não iniciado');
      setPriority(formattedTask.priority || 'Média');
      setLabelText(formattedTask.label_text || '');
      setLabelColor(formattedTask.label_color || LABEL_COLORS[0]);
      setSelectedAssignees(formattedTask.assignees ? formattedTask.assignees.map(a => a.id) : []);

      const { data: bucketsData, error: bucketsError } = await supabase
        .from('buckets')
        .select('*')
        .eq('project_id', formattedTask.project_id)
        .order('created_at', { ascending: true });

      if (bucketsError) throw bucketsError;
      setBuckets(bucketsData || []);

      const { data: commentsData, error: commentsError } = await supabase
        .from('comments')
        .select(`
          *,
          member:team_members(*)
        `)
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });

      if (commentsError) throw commentsError;
      setComments(commentsData || []);
    } catch (err: any) {
      console.error('Erro ao buscar detalhes da tarefa:', err);
      setError('Não foi possível carregar os detalhes desta tarefa.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTaskDetails();
  }, [taskId]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog) {
      dialog.showModal();

      const handleClose = () => onClose();
      dialog.addEventListener('close', handleClose);

      const handleBackdropClick = (event: MouseEvent) => {
        if (event.target !== dialog) return;
        const rect = dialog.getBoundingClientRect();
        const isInsideDialog = (
          rect.top <= event.clientY &&
          event.clientY <= rect.top + rect.height &&
          rect.left <= event.clientX &&
          event.clientX <= rect.left + rect.width
        );
        if (!isInsideDialog) dialog.close();
      };

      dialog.addEventListener('click', handleBackdropClick);

      return () => {
        dialog.removeEventListener('close', handleClose);
        dialog.removeEventListener('click', handleBackdropClick);
      };
    }
  }, [onClose]);

  useEffect(() => {
    if (commentListRef.current) {
      commentListRef.current.scrollTop = commentListRef.current.scrollHeight;
    }
  }, [comments]);

  const handleToggleStatus = async () => {
    if (!task) return;
    const nextStatus = status === 'Concluído' ? 'Não iniciado' : 'Concluído';

    try {
      const { error: dbError } = await supabase
        .from('tasks')
        .update({ status: nextStatus })
        .eq('id', task.id);

      if (dbError) throw dbError;
      setTask({ ...task, status: nextStatus });
      setStatus(nextStatus);
      toast.success(nextStatus === 'Concluído' ? 'Tarefa concluída.' : 'Tarefa reaberta.');
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
      toast.error('Não foi possível alterar o status da tarefa.');
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim() || !selectedAuthorId) return;

    try {
      setCommentLoading(true);

      const { data: commentData, error: dbError } = await supabase
        .from('comments')
        .insert([{
          task_id: taskId,
          member_id: selectedAuthorId,
          content: commentText.trim()
        }])
        .select(`
          *,
          member:team_members(*)
        `);

      if (dbError) throw dbError;

      if (commentData && commentData[0]) {
        setComments([...comments, commentData[0]]);
        setCommentText('');
        toast.success('Comentário registrado.');
      }
    } catch (err) {
      console.error('Erro ao adicionar comentário:', err);
      toast.error('Não foi possível adicionar o comentário.');
    } finally {
      setCommentLoading(false);
    }
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !bucketId) return;

    try {
      setSaveLoading(true);

      const { error: taskError } = await supabase
        .from('tasks')
        .update({
          title: title.trim(),
          description: description.trim() || null,
          start_date: startDate || null,
          due_date: dueDate || null,
          status,
          priority,
          label_text: labelText.trim() || null,
          label_color: labelText.trim() ? labelColor : null,
          bucket_id: bucketId
        })
        .eq('id', taskId);

      if (taskError) throw taskError;

      const { error: deleteError } = await supabase
        .from('task_assignees')
        .delete()
        .eq('task_id', taskId);

      if (deleteError) throw deleteError;

      if (selectedAssignees.length > 0) {
        const { error: insertError } = await supabase
          .from('task_assignees')
          .insert(selectedAssignees.map(memberId => ({ task_id: taskId, member_id: memberId })));

        if (insertError) throw insertError;

        // Notify newly added assignees (best-effort via profiles.email match)
        if (task) {
          const previousIds = task.assignees.map(a => a.id);
          const newlyAddedIds = selectedAssignees.filter(id => !previousIds.includes(id));
          if (newlyAddedIds.length > 0) {
            const newMembers = teamMembers.filter(m => newlyAddedIds.includes(m.id));
            for (const member of newMembers) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('id')
                .eq('email', member.email)
                .maybeSingle();
              if (profile && profile.id !== currentUserId) {
                await supabase.from('notifications').insert({
                  user_id: profile.id,
                  type: 'task_assigned',
                  title: 'Você foi atribuído a uma tarefa',
                  body: title.trim(),
                  task_id: taskId,
                });
              }
            }
          }
        }
      }

      toast.success('Alterações salvas.');
      dialogRef.current?.close();
    } catch (err) {
      console.error('Erro ao salvar alterações da tarefa:', err);
      toast.error('Não foi possível salvar as alterações da tarefa.');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!window.confirm('Tem certeza que deseja excluir esta tarefa? Esta ação não pode ser desfeita.')) return;

    try {
      setDeleteLoading(true);

      const { error: dbError } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (dbError) throw dbError;

      toast.success('Tarefa excluída.');
      dialogRef.current?.close();
    } catch (err) {
      console.error('Erro ao excluir tarefa:', err);
      toast.error('Não foi possível excluir a tarefa.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleAssigneeCheckboxChange = (memberId: string) => {
    setSelectedAssignees(prev =>
      prev.includes(memberId) ? prev.filter(id => id !== memberId) : [...prev, memberId]
    );
  };

  const formatCommentDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <dialog
      ref={dialogRef}
      className="premium-modal"
      closedby="any"
      aria-labelledby="task-dialog-title"
      style={{ maxWidth: '800px', width: '95%' }}
    >
      <div className="modal-header">
        <div style={{ flex: 1, paddingRight: '1.5rem' }}>
          <h2 id="task-dialog-title" style={{ fontSize: '1.6rem', lineHeight: '1.3', fontFamily: 'var(--font-serif)' }}>
            Detalhes e Delegação
          </h2>
        </div>
        <button className="modal-close" onClick={() => dialogRef.current?.close()}>×</button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem 0', fontStyle: 'italic', color: 'var(--accent-gold)' }}>
          Carregando informações da tarefa...
        </div>
      ) : error || !task ? (
        <div style={{ color: '#ff99bb', padding: '1rem 0' }}>
          {error || 'Não foi possível carregar os detalhes.'}
        </div>
      ) : (
        <form onSubmit={handleSaveTask}>
          <div className="task-details-grid">
            {/* Left Column: Title, Description, and Comments */}
            <div>
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label">Título da Tarefa</label>
                <input
                  type="text"
                  className="form-input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Título..."
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label">Memorial Descritivo / Instruções</label>
                <textarea
                  className="form-textarea"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detalhamento ou memorial..."
                  style={{ minHeight: '120px' }}
                />
              </div>

              {/* Comment Thread */}
              <div className="comments-section" style={{ borderTop: '1px solid rgba(163, 133, 96, 0.15)', marginTop: '2rem', paddingTop: '1.5rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-serif)', marginBottom: '1rem' }}>
                  Discussões e Alinhamentos
                </h3>

                {comments.length === 0 ? (
                  <p style={{ fontStyle: 'italic', fontSize: '0.85rem', color: 'var(--text-secondary)', padding: '0.5rem 0 1.5rem 0' }}>
                    Nenhuma mensagem na thread. Registre a primeira atualização abaixo.
                  </p>
                ) : (
                  <div className="comment-list scroller" ref={commentListRef} style={{ maxHeight: '200px' }}>
                    {comments.map(comment => (
                      <div key={comment.id} className="comment-item" style={{ padding: '0.75rem 1rem', marginBottom: '0.75rem' }}>
                        <div className="comment-header">
                          <span className="comment-author-name">{comment.member?.name || 'Membro Excluído'}</span>
                          <span className="comment-date">{formatCommentDate(comment.created_at)}</span>
                        </div>
                        <div className="comment-body" style={{ fontSize: '0.85rem' }}>{comment.content}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Inline Comment Creation */}
                <div style={{ backgroundColor: 'rgba(7, 34, 26, 0.3)', border: '1px solid rgba(163, 133, 96, 0.1)', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
                  <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                    <label className="form-label" style={{ fontSize: '0.65rem', marginBottom: '0.25rem' }}>Comentar como:</label>
                    <select
                      className="form-select"
                      style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}
                      value={selectedAuthorId}
                      onChange={(e) => setSelectedAuthorId(e.target.value)}
                    >
                      <option value="">Selecione quem você é...</option>
                      {teamMembers.map(member => (
                        <option key={member.id} value={member.id}>
                          {member.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                    <textarea
                      className="form-textarea"
                      style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem', minHeight: '50px' }}
                      placeholder="Adicione uma atualização de progresso..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                    />
                  </div>

                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ width: '100%', padding: '0.4rem', fontSize: '0.7rem' }}
                    onClick={handleAddComment}
                    disabled={commentLoading || !commentText.trim() || !selectedAuthorId}
                  >
                    {commentLoading ? 'Enviando...' : 'Registrar Comentário'}
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Metadata Sidebar & Actions */}
            <div style={{
              borderLeft: '1px solid rgba(163, 133, 96, 0.15)',
              paddingLeft: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem'
            }}>
              {/* Status */}
              <div>
                <label className="form-label" style={{ fontSize: '0.7rem' }}>Status</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem', marginBottom: '0.5rem' }}>
                  <span style={{
                    display: 'inline-block',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: status === 'Concluído'
                      ? '#8ce6cd'
                      : status === 'Em andamento'
                        ? 'var(--accent-gold)'
                        : 'var(--text-secondary)'
                  }} />
                  <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{status}</span>
                </div>
                <select
                  className="form-select"
                  style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem', marginBottom: '0.5rem' }}
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'Não iniciado' | 'Em andamento' | 'Concluído')}
                  required
                >
                  <option value="Não iniciado">Não iniciado</option>
                  <option value="Em andamento">Em andamento</option>
                  <option value="Concluído">Concluído</option>
                </select>
                <button
                  type="button"
                  onClick={handleToggleStatus}
                  className="btn btn-secondary"
                  style={{ width: '100%', padding: '0.35rem 0.75rem', fontSize: '0.7rem' }}
                >
                  {status === 'Concluído' ? 'Reabrir Tarefa' : 'Marcar como Concluída'}
                </button>
              </div>

              {/* Priority */}
              <div>
                <label className="form-label" style={{ fontSize: '0.7rem' }}>Prioridade</label>
                <select
                  className="form-select"
                  style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as 'Baixa' | 'Média' | 'Alta' | 'Urgente')}
                >
                  <option value="Baixa">Baixa</option>
                  <option value="Média">Média</option>
                  <option value="Alta">Alta</option>
                  <option value="Urgente">Urgente</option>
                </select>
              </div>

              {/* Bucket Selection */}
              <div>
                <label className="form-label" style={{ fontSize: '0.7rem' }}>Bucket (Coluna)</label>
                <select
                  className="form-select"
                  style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                  value={bucketId}
                  onChange={(e) => setBucketId(e.target.value)}
                  required
                >
                  {buckets.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              {/* Dates */}
              <div>
                <label className="form-label" style={{ fontSize: '0.7rem' }}>Data de Início</label>
                <input
                  type="date"
                  className="form-input"
                  style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.7rem' }}>Data de Vencimento</label>
                <input
                  type="date"
                  className="form-input"
                  style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>

              {/* Assignees */}
              <div>
                <label className="form-label" style={{ fontSize: '0.7rem', marginBottom: '0.25rem' }}>Equipe Responsável</label>
                <div className="assignee-select-container" style={{ maxHeight: '120px', padding: '0.5rem' }}>
                  {teamMembers.map(member => (
                    <label key={member.id} className="assignee-checkbox-label" style={{ fontSize: '0.8rem' }}>
                      <input
                        type="checkbox"
                        className="assignee-checkbox"
                        checked={selectedAssignees.includes(member.id)}
                        onChange={() => handleAssigneeCheckboxChange(member.id)}
                      />
                      <span>{member.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Label */}
              <div>
                <label className="form-label" style={{ fontSize: '0.7rem' }}>Rótulo</label>
                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                  {LABEL_COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setLabelColor(color)}
                      style={{
                        width: '20px', height: '20px', borderRadius: '3px',
                        backgroundColor: color, padding: 0, flexShrink: 0, cursor: 'pointer',
                        border: labelColor === color ? '2.5px solid #242424' : '2px solid transparent',
                      }}
                    />
                  ))}
                </div>
                <input
                  type="text"
                  className="form-input"
                  style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                  placeholder="Texto do rótulo (opcional)..."
                  value={labelText}
                  onChange={e => setLabelText(e.target.value)}
                  maxLength={30}
                />
                {labelText && (
                  <div style={{ marginTop: '0.4rem' }}>
                    <span className="label-tag" style={{ backgroundColor: labelColor }}>
                      {labelText}
                    </span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingTop: '1rem', borderTop: '1px solid rgba(163, 133, 96, 0.1)' }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '0.5rem', fontSize: '0.75rem' }}
                  disabled={saveLoading || !title.trim()}
                >
                  {saveLoading ? 'Salvando...' : 'Salvar Alterações'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ width: '100%', padding: '0.5rem', fontSize: '0.75rem' }}
                  onClick={() => dialogRef.current?.close()}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    fontSize: '0.75rem',
                    marginTop: '0.5rem',
                    borderColor: 'rgba(216, 59, 1, 0.4)',
                    color: '#D83B01'
                  }}
                  onClick={handleDeleteTask}
                  disabled={deleteLoading}
                >
                  {deleteLoading ? 'Excluindo...' : 'Excluir Tarefa'}
                </button>
              </div>
            </div>
          </div>
        </form>
      )}
    </dialog>
  );
};
