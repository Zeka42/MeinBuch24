import { Book, User } from './types';

export const MOCK_USERS: User[] = [
  {
    id: 'user-1',
    email: 'autor@herzensbuch.de',
    name: 'Sophie Autorin',
    role: 'customer',
    avatarUrl: 'https://picsum.photos/id/64/100/100',
    joinedAt: '2023-01-15',
    bookCount: 1
  },
  {
    id: 'user-2',
    email: 'hans@beispiel.de',
    name: 'Hans Müller',
    role: 'customer',
    avatarUrl: 'https://picsum.photos/id/66/100/100',
    joinedAt: '2023-03-22',
    bookCount: 1
  },
  {
    id: 'emp-1',
    email: 'editor@herzensbuch.de',
    name: 'Max Lektor',
    role: 'employee',
    avatarUrl: 'https://picsum.photos/id/65/100/100',
    joinedAt: '2022-11-01'
  }
];

export const MOCK_BOOKS: Book[] = [
  {
    id: 'book-1',
    userId: 'user-1',
    authorName: 'Sophie Autorin',
    title: 'Mein Weg zum Glück',
    description: 'Eine inspirierende Biografie über das Finden der inneren Mitte.',
    status: 'draft',
    updatedAt: '2023-10-27T10:00:00Z',
    coverUrl: 'https://picsum.photos/id/20/300/450',
    timeSpentSeconds: 14500, // approx 4 hours
    activityLog: [
      { id: 'log-1', action: 'Buch erstellt', details: 'Projekt gestartet', timestamp: '2023-10-20T09:00:00Z', userId: 'user-1' },
      { id: 'log-2', action: 'Kapitel bearbeitet', details: 'Kapitel 1: Der Anfang', timestamp: '2023-10-22T14:30:00Z', userId: 'user-1' },
      { id: 'log-3', action: 'Kommentar', details: 'Neuer Kommentar zu Seite 1.1', timestamp: '2023-10-26T14:30:00Z', userId: 'emp-1' }
    ],
    chapters: [
      {
        id: 'chap-1',
        bookId: 'book-1',
        number: 1,
        title: 'Der Anfang',
        pages: [
          {
            id: 'page-1-1',
            chapterId: 'chap-1',
            number: '1.1',
            title: 'Kindheitsträume',
            content: 'Es war einmal an einem sonnigen Morgen...',
            comments: [
              {
                id: 'c-1',
                pageId: 'page-1-1',
                userId: 'emp-1',
                userName: 'Max Lektor',
                text: 'Guter Einstieg, aber bitte den zweiten Absatz prüfen.',
                status: 'pending',
                createdAt: '2023-10-26T14:30:00Z'
              }
            ]
          },
          {
            id: 'page-1-2',
            chapterId: 'chap-1',
            number: '1.2',
            title: 'Die erste Reise',
            content: 'Ich packte meinen Koffer und wusste nicht, wohin...',
            comments: []
          }
        ]
      },
      {
        id: 'chap-2',
        bookId: 'book-1',
        number: 2,
        title: 'Herausforderungen',
        pages: []
      }
    ]
  },
  {
    id: 'book-2',
    userId: 'user-2',
    authorName: 'Hans Müller',
    title: 'Digitale Transformation',
    description: 'Fachbuch über modernen Wandel.',
    status: 'pending_approval',
    updatedAt: '2023-10-28T09:15:00Z',
    coverUrl: 'https://picsum.photos/id/24/300/450',
    timeSpentSeconds: 3600, // 1 hour
    activityLog: [
      { id: 'log-4', action: 'Buch erstellt', details: 'Projekt gestartet', timestamp: '2023-10-28T08:00:00Z', userId: 'user-2' }
    ],
    chapters: []
  }
];