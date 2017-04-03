import { Component, OnInit, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';
import { MdDialog, MdDialogRef, MdSnackBar } from '@angular/material';

import { Lesson } from '../../models/lesson';

import { LessonService } from '../../services/lesson.service';
import { VideoSessionService } from '../../services/video-session.service';
import { AuthenticationService } from '../../services/authentication.service';

import { JoinSessionDialogComponent } from './join-session-dialog.component';

@Component({
    selector: 'app-dashboard',
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent implements OnInit {

    lessons: Lesson[];

    addingLesson: false;
    lessonTitle: string;
    sumbitNewLesson: boolean;

    constructor(
        private lessonService: LessonService,
        private videoSessionService: VideoSessionService,
        private authenticationService: AuthenticationService,
        private router: Router,
        public snackBar: MdSnackBar,
        public dialog: MdDialog
    ) { }

    ngOnInit(): void {
        this.authenticationService.checkCredentials();
        this.getLessons();
    }

    logout() {
        this.authenticationService.logOut();
    }

    getLessons(): void {
        this.lessonService.getLessons(this.authenticationService.getCurrentUser()).subscribe(
            lessons => {
                console.log('User\'s lessons: ');
                console.log(lessons);
                this.lessons = lessons;
                this.authenticationService.updateUserLessons(this.lessons);
            },
            error => console.log(error));
    }

    goToLesson(lesson: Lesson) {
        let dialogRef: MdDialogRef<JoinSessionDialogComponent>;
        dialogRef = this.dialog.open(JoinSessionDialogComponent);
        dialogRef.componentInstance.myReference = dialogRef;

        dialogRef.afterClosed().subscribe(cameraOptions => {
            if (cameraOptions != null) {
                console.log('Joining session with options:');
                console.log(cameraOptions);
                this.videoSessionService.lesson = lesson;
                this.videoSessionService.cameraOptions = cameraOptions;
                this.router.navigate(['/lesson/' + lesson.id]);
            }
        });
    }

    goToLessonDetails(lesson: Lesson) {
        this.router.navigate(['/lesson-details/' + lesson.id]);
    }

    newLesson() {
        this.sumbitNewLesson = true;
        this.lessonService.newLesson(new Lesson(this.lessonTitle)).subscribe(
            lesson => {
                console.log('New lesson added: ');
                console.log(lesson);
                this.lessons.push(lesson);
                this.authenticationService.updateUserLessons(this.lessons);
                this.sumbitNewLesson = false;
                this.snackBar.open('Lesson added!', undefined, { duration: 3000 });
                this.addingLesson = false;
            },
            error => {
                console.log(error);
                this.sumbitNewLesson = false;
                this.snackBar.open('There has been a problem...', undefined, { duration: 3000 });
            }
        );
    }

    createSession(lessonId: number){
        this.videoSessionService.createSession(lessonId).subscribe(
            response => {
                console.log(response.text());
            },
            error => {
                console.log(error);
            }
        )
    }

    generateToken(lessonId: number) {
        this.videoSessionService.generateToken(lessonId).subscribe(
            response => {
                console.log(response.text());
            },
            error => {
                console.log(error);
            }
        )
    }

}