import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, OnChanges, SimpleChanges } from "@angular/core";
import { UserService } from "src/app/services/user.service";
import { GLOBAL } from "src/app/services/global";
import { LABEL_PROFILE } from "../../homeData";
import { LessonService } from "src/app/services/lesson.service";

@Component({
  selector: "details-call",
  templateUrl: "./details-call.component.html",
  standalone: false,
})
export class DetailsCallComponent implements OnInit, OnDestroy, OnChanges {
  public title;
  public identity;
  public token;
  public url;

  public fields;
  public types;

  public profile_label;

  @Input() lesson;
  @Input() isJoin;
  @Output() isJoined = new EventEmitter();

  private realtimeTimer: any;

  constructor(
    private _userService: UserService,
    private _lessonService: LessonService,
  ) {
    this.title = "Agregar recurso";
    this.identity = this._userService.getIdentity();
    this.token = this._userService.getToken();
    this.url = GLOBAL.url;

    this.profile_label = LABEL_PROFILE;
  }

  ngOnInit(): void {
    this.startRealtimeSync();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["lesson"]) {
      this.restartRealtimeSync();
    }
  }

  ngOnDestroy(): void {
    this.stopRealtimeSync();
  }

  getLink(url) {
    if (url.includes("http://") || url.includes("https://")) {
      return url;
    } else {
      return `http://${url}`;
    }
  }

  hasJoined(lesson) {
    if (!lesson || !lesson.call || !lesson.call.interested) {
      return false;
    }

    const interestedIds = lesson.call.interested.map(
      (interested) => interested?._id || interested,
    );
    return interestedIds.indexOf(this.identity?._id) >= 0;
  }

  public Templesson;
  getLesson(lesson) {
    this.Templesson = lesson;
  }
  abandonLesson() {
    if (!this.Templesson) {
      return;
    }
    this.editLesson(this.Templesson, "remove");
  }
  onLeaveClick(lesson: any): void {
    const confirmed = confirm('¿Estas seguro que quieres retirarte de este grupo de desarrollo?');
    if (!confirmed) { return; }
    this.getLesson(lesson);
    this.abandonLesson();
  }
  editLesson(lesson, action) {
    if (!lesson || !lesson.call) {
      return;
    }

    const editLesson = { ...lesson };
    editLesson.call = { ...lesson.call };
    editLesson.call.interested = (lesson.call.interested || []).map(
      (interested) => interested?._id || interested,
    );

    if (action === "remove") {
      const ix = editLesson.call.interested.indexOf(this.identity?._id);
      if (ix >= 0) {
        editLesson.call.interested.splice(ix, 1);
      } else {
        return;
      }
    } else if (action === "add") {
      if (editLesson.call.interested.indexOf(this.identity?._id) >= 0) {
        return;
      }
      editLesson.call.interested.push(this.identity?._id);
    }

    this._lessonService.editLesson(this.token, editLesson).subscribe({
      next: (response) => {
        if (response && response.lesson && response.lesson._id) {
          // Re-cargar la lección para asegurar que los interesados vengan populados
          this.refreshLesson(response.lesson._id);
          this.isJoined.emit();
        }
      },
      error: (error) => {
        console.log(<any>error);
      },
    });
  }

  private refreshLesson(lessonId: string): void {
    if (!lessonId) { return; }
    this._lessonService.getLesson(this.token, lessonId).subscribe({
      next: (res) => {
        if (res && res.lesson) {
          this.lesson = res.lesson;
        }
      },
      error: (err) => {
        console.warn('No se pudo actualizar la lección en tiempo real:', err);
      }
    });
  }

  private startRealtimeSync(): void {
    this.stopRealtimeSync();
    const id = this.lesson?._id;
    if (!id) { return; }
    // Polling ligero cada 5s mientras el modal está abierto
    this.realtimeTimer = setInterval(() => this.refreshLesson(id), 5000);
  }

  private stopRealtimeSync(): void {
    if (this.realtimeTimer) {
      clearInterval(this.realtimeTimer);
      this.realtimeTimer = null;
    }
  }

  private restartRealtimeSync(): void {
    this.startRealtimeSync();
  }
}
