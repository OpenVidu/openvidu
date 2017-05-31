import { Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { Location } from '@angular/common';
import { MdSnackBar } from '@angular/material';

import { Lesson } from '../../models/lesson';
import { User } from '../../models/user';

import { LessonService } from '../../services/lesson.service';
import { AuthenticationService } from '../../services/authentication.service';

@Component({
    selector: 'app-lesson-details',
    templateUrl: './lesson-details.component.html',
    styleUrls: ['./lesson-details.component.css'],
})
export class LessonDetailsComponent implements OnInit {

    lesson: Lesson;

    editingTitle = false;
    titleEdited: string;
    sumbitEditLesson = false;
    emailAttender: string;
    sumbitAddAttenders = false;
    arrayOfAttDels = [];

    // Feedback message parameters
    addAttendersCorrect = false;
    addAttendersError = false;
    attErrorTitle: string;
    attErrorContent: string;
    attCorrectTitle: string;
    attCorrectContent: string;

    constructor(
        private lessonService: LessonService,
        private authenticationService: AuthenticationService,
        private router: Router,
        private route: ActivatedRoute,
        private location: Location,
        public snackBar: MdSnackBar
    ) { }

    ngOnInit(): void {
        this.route.params
            .map((params: Params) => this.lessonService.obtainLocalLesson(+params['id']))
            .subscribe(lesson => this.lesson = lesson);
    }

    editLesson() {
        if (this.titleEdited !== this.lesson.title) {
            this.sumbitEditLesson = true;
            let l = new Lesson(this.titleEdited);
            l.id = this.lesson.id;
            this.lessonService.editLesson(l).subscribe(
                lesson => {
                    // Lesson has been updated
                    console.log('Lesson edited: ');
                    console.log(lesson);
                    this.lesson = lesson;
                    this.sumbitEditLesson = false;
                    this.editingTitle = false;
                    this.snackBar.open('Lesson edited!', undefined, { duration: 3000 });
                },
                error => {
                    console.log(error);
                    this.sumbitEditLesson = false;
                    this.snackBar.open('There has been a problem...', undefined, { duration: 3000 });
                });
        } else {
            this.editingTitle = false; // The user has not modified the title
        }
    }

    deleteLesson() {
        this.sumbitEditLesson = true;
        this.lessonService.deleteLesson(this.lesson.id).subscribe(
            lesson => {
                // Lesson has been deleted
                console.log('Lesson deleted');
                console.log(lesson);
                this.sumbitEditLesson = false;
                this.router.navigate(['/lessons']);
                this.snackBar.open('Lesson deleted!', undefined, { duration: 3000 });
            },
            error => {
                console.log(error);
                this.sumbitEditLesson = false;
                this.snackBar.open('There has been a problem...', undefined, { duration: 3000 });
            });
    }

    addLessonAttenders() {
        this.sumbitAddAttenders = true;
        this.lessonService.addLessonAttenders(this.lesson.id, [this.emailAttender]).subscribe(
            response => { // response: attendersAdded, attendersAlreadyAdded, emailsInvalid, emailsValidNotRegistered
                console.log('Attender added');
                console.log(response);
                this.sumbitAddAttenders = false;
                let newAttenders = response.attendersAdded as User[];
                this.lesson.attenders = this.lesson.attenders.concat(newAttenders);
                this.handleAttendersMessage(response);
            },
            error => {
                console.log(error);
                this.sumbitAddAttenders = false;
                this.snackBar.open('There has been a problem...', undefined, { duration: 3000 });
            });
    }

    deleteLessonAttender(i: number, attender: User) {
        this.arrayOfAttDels[i] = true;
        let l = new Lesson(this.lesson.title);
        l.id = this.lesson.id;
        for (let i = 0; i < this.lesson.attenders.length; i++) {
            if (this.lesson.attenders[i].id !== attender.id) {
                l.attenders.push(new User(this.lesson.attenders[i])); //Inserting a new User object equal to the attender but "lessons" array empty
            }
        }
        this.lessonService.deleteLessonAttenders(l).subscribe(
            attenders => {
                console.log('Attender removed');
                console.log(attenders);
                this.arrayOfAttDels[i] = false;
                this.lesson.attenders = attenders;
                this.snackBar.open('Attender removed!', undefined, { duration: 3000 });
            },
            error => {
                console.log(error);
                this.arrayOfAttDels[i] = false;
                this.snackBar.open('There has been a problem...', undefined, { duration: 3000 });
            });
    }

    // Creates an error message when there is any problem during the process of adding Users to a Lesson
    // It also generates a correct feedback message when any student has been correctly added to the Lesson
    handleAttendersMessage(response) {
        let isError: boolean = false;
        let isCorrect: boolean = false;
        this.attErrorContent = "";
        this.attCorrectContent = "";

        if (response.attendersAdded.length > 0) {
            for (let user of response.attendersAdded) {
                this.attCorrectContent += "<span class='feedback-list'>" + user.name + "</span>";
            }
            isCorrect = true;
        }
        if (response.attendersAlreadyAdded.length > 0) {
            this.attErrorContent += "<span>The following users were already added to the lesson</span>";
            for (let user of response.attendersAlreadyAdded) {
                this.attErrorContent += "<span class='feedback-list'>" + user.name + "</span>";
            }
            isError = true;
        }
        if (response.emailsValidNotRegistered.length > 0) {
            this.attErrorContent += "<span>The following users are not registered</span>";
            for (let email of response.emailsValidNotRegistered) {
                this.attErrorContent += "<span class='feedback-list'>" + email + "</span>";
            }
            isError = true;
        }
        if (response.emailsInvalid) {
            if (response.emailsInvalid.length > 0) {
                this.attErrorContent += "<span>These are not valid emails</span>";
                for (let email of response.emailsInvalid) {
                    this.attErrorContent += "<span class='feedback-list'>" + email + "</span>";
                }
                isError = true;
            }
        }
        if (isError) {
            this.attErrorTitle = "There have been some problems";
            this.addAttendersError = true;
        } else if (response.attendersAdded.length == 0) {
            this.attErrorTitle = "No emails there!";
            this.addAttendersError = true;
        }
        if (isCorrect) {
            this.attCorrectTitle = "The following users where properly added";
            this.addAttendersCorrect = true;
        }
    }

}