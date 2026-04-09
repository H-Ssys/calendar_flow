// Types for Daily Journal / PDAC Feature
export interface TimeSlot {
  id: string;
  startTime: string; // HH:mm format
  endTime: string;
  planText: string;
  actualText: string;
  done: boolean;
  deadline: string;
  linkedEventIds: string[];
  linkedTaskIds: string[];
}

export interface UrgentTask {
  id: string;
  taskText: string;
  deadline: string; // YYYY-MM-DD format
  done: boolean;
  priority: 'high' | 'medium' | 'low';
}

export interface JournalGoals {
  yearlyGoalText: string; // Ước Mơ, Hy Vọng Trong Năm Nay
  monthlyGoalText: string; // Mục Tiêu Tháng Này
  dailyGoalText: string; // Mục tiêu Ngày Hôm Nay
  dailyGoalResult: string; // Kết Quả Mục Tiêu Ngày Hôm Nay
}

export interface JournalReflections {
  gratitudeGood: string; // Việc Đã Làm Tốt/ Biết Ơn
  standardizeRules: string; // Việc Cần Quy Tắc Hóa
  notGood: string; // Việc Làm Không Tốt
  improvements: string; // Cách Cải Thiện
  selfEncouragement: string; // Khích Lệ Động Viên Bản Thân
  notes: string; // Ghi Chú
}

export interface DailyJournalEntry {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD format
  timezone: string;
  title: string;
  timeSlots: TimeSlot[];
  urgentTasks: UrgentTask[];
  goals: JournalGoals;
  reflections: JournalReflections;
  attachments?: Array<{
    id: string;
    type: 'image' | 'pdf';
    url: string;
    name: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}
