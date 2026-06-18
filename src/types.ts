export const categories = [
  'JavaScript',
  'Python',
  'HTML/CSS',
  'SQL',
  'Networking',
  'OOP',
  'General IT',
] as const;

export type Category = (typeof categories)[number];
export type Answer = 'A' | 'B' | 'C' | 'D';

export interface QuizQuestion {
  id: number;
  category: Category;
  question: string;
  options: Record<Answer, string>;
  correctAnswer: Answer;
  explanation: string;
}

export type PublicQuizQuestion = Omit<QuizQuestion, 'correctAnswer' | 'explanation'>;

export function hideAnswer(question: QuizQuestion): PublicQuizQuestion {
  const { correctAnswer, explanation, ...rest } = question;
  return rest;
}
