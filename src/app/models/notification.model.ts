export class Notification {
    constructor(
      public _id: string,
      public user: string,
      public type: string,
      public title: string,
      public content: string,
      public link: string,
      public read: boolean,
      public created_at: string,
      public from?: any,
      public relatedId?: string,
      public relatedModel?: string,
      public priority?: string,
      public read_at?: string
    ) {}
}
  