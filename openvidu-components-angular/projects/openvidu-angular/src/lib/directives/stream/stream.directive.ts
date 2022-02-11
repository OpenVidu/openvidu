import { Directive, OnInit, TemplateRef, ViewContainerRef } from '@angular/core';

@Directive({
	selector: '[ovStream]'
})
export class StreamDirective implements OnInit {
	constructor(public template: TemplateRef<any>, public container: ViewContainerRef) {}

	ngOnInit() {}
}
