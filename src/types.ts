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
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  owner_id: string | null;
}

export interface Task {
  id: string;
  project_id: string;
  bucket_id: string;
  title: string;
  description: string | null;
  start_date: string | null;
  due_date: string | null;
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

// Auth/multiuser types
export interface Profile {
  id: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: 'owner' | 'member';
  invited_by: string | null;
  status: 'pending' | 'accepted';
  created_at: string;
}

export interface ProjectInvite {
  id: string;
  project_id: string;
  token: string;
  created_by: string;
  expires_at: string;
  created_at: string;
}

export interface AppNotification {
  id: string;
  user_id: string;
  type: 'task_assigned' | 'project_invite' | 'comment_added' | 'task_due_soon';
  title: string;
  body: string | null;
  read: boolean;
  project_id: string | null;
  task_id: string | null;
  created_at: string;
}
