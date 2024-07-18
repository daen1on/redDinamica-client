export class Notification {
    constructor(
      public _id: string,
      public user: string,
      public type: string,
      public content: string,
      public link: string,
      public read: boolean,
      public created_at: string
    ) {}
  }
  