export interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
}

export interface Bucket {
  id: string;
  project_id: string;
  name: string;
  created_at: string;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  start_date: string | null; // Format: YYYY-MM-DD
  end_date: string | null;   // Format: YYYY-MM-DD
  created_at: string;
}

export interface Task {
  id: string;
  project_id: string;
  bucket_id: string;
  title: string;
  description: string | null;
  start_date: string | null; // Format: YYYY-MM-DD
  due_date: string | null;   // Format: YYYY-MM-DD
  status: 'Não iniciado' | 'Em andamento' | 'Concluído';
  priority: 'Baixa' | 'Média' | 'Alta' | 'Urgente';
  label_text: string | null;
  label_color: string | null;
}

export interface TaskAssignee {
  task_id: string;
  member_id: string;
}

export interface Comment {
  id: string;
  task_id: string;
  member_id: string;
  content: string;
  created_at: string;
}

// Joined types for application use
export interface TaskWithAssignees extends Task {
  assignees: TeamMember[];
}

export interface CommentWithMember extends Comment {
  member: TeamMember;
}

export interface ProjectWithMembers extends Project {
  members: TeamMember[];
}
