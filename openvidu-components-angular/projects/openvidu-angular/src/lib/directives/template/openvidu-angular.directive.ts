import { Directive, TemplateRef, ViewContainerRef } from '@angular/core';

/**
 * The ***ovToolbar** directive allows to replace the default toolbar component injecting your custom template.
 *
 * @example
 * <my-custom-toolbar *ovToolbar></my-custom-toolbar>
 *
 */
@Directive({
	selector: '[ovToolbar]'
})
export class ToolbarDirective {
	/**
	 * @ignore
	 */
	constructor(public template: TemplateRef<any>, public viewContainer: ViewContainerRef) {}
}

/**
 * The ***ovToolbarAdditionalButtons** directive allows to add additional buttons to the toolbar.
 * There are two ways to use this directive:
 *
 * 1. Adding it to an element as a child of the parent element **_ov-videoconference_** {@link VideoconferenceComponent}
 * @example
 * <ov-videoconference>
 *	<div *ovToolbarAdditionalButtons>
 *		<button>Additional button</button>
 *		<button>Click Me</button>
 * 	</div>
 * </ov-videoconference>
 *
 * <br>
 * 2. Adding it to an element as child of the element tagged with the {@link ToolbarDirective}
 * @example
 * <ov-videoconference>
 * 	<my-toolbar *ovToolbar>
 *		<div *ovToolbarAdditionalButtons>
 *			<button>Additional button</button>
 *			<button>Click Me</button>
 * 		</div>
 * 	</my-toolbar>
 * </ov-videoconference>
 *
 */
@Directive({
	selector: '[ovToolbarAdditionalButtons]'
})
export class ToolbarAdditionalButtonsDirective {
	/**
	 * @ignore
	 */
	constructor(public template: TemplateRef<any>, public viewContainer: ViewContainerRef) {}
}

/**
 * The ***ovPanel** directive allows to replace the default panel component injecting your custom template.
 *
 * This directive is closely related to {@link ChatPanelDirective} and {@link ParticipantsPanelDirective}.
 *
 *
 * @example
 * <my-custom-panel *ovPanel>
 * ...
 * </my-custom-panel>
 *
 */

@Directive({
	selector: '[ovPanel]'
})
export class PanelDirective {
	constructor(public template: TemplateRef<any>, public viewContainer: ViewContainerRef) {}
}


/**
 * The ***ovChatPanel** directive allows to replace the defaultchat panel template injecting your own component.
 * There are two ways to use this directive:
 *
 * 1. Adding it to an element as a child of the parent element **_ov-videoconference_** {@link VideoconferenceComponent}
 * @example
 * <ov-videoconference>
 *	<my-chat-panel *ovChatPanel></my-chat-panel>
 * </ov-videoconference>
 *
 * <br>
 * 2. Adding it to an element as child of the element tagged with the {@link ToolbarDirective}
 * @example
 * <ov-videoconference>
 * 	<my-panel *ovPanel>
 *		<my-chat-panel *ovChatPanel></my-chat-panel>
 * 	</my-panel>
 * </ov-videoconference>
 *
 * <div class="info-container">
 * 	<span>INFO:</span>
 * 	You also can use the default components  adsada dasda d asd
 * </div>
 *
 */
@Directive({
	selector: '[ovChatPanel]'
})
export class ChatPanelDirective {
	constructor(public template: TemplateRef<any>, public viewContainer: ViewContainerRef) {}
}

@Directive({
	selector: '[ovParticipantsPanel]'
})
export class ParticipantsPanelDirective {
	constructor(public template: TemplateRef<any>, public viewContainer: ViewContainerRef) {}
}

@Directive({
	selector: '[ovParticipantPanelItem]'
})
export class ParticipantPanelItemDirective {
	constructor(public template: TemplateRef<any>, public viewContainer: ViewContainerRef) {}
}

@Directive({
	selector: '[ovParticipantPanelItemElements]'
})
export class ParticipantPanelItemElementsDirective {
	constructor(public template: TemplateRef<any>, public viewContainer: ViewContainerRef) {}
}

@Directive({
	selector: '[ovLayout]'
})
export class LayoutDirective {
	constructor(public template: TemplateRef<any>, public container: ViewContainerRef) {}
}

/**
 * The ***ovStream** directive allows to replace the default stream component template injecting your own component.
 * There are two ways to use this directive:
 *
 * 1. Adding it to an element as a child of the parent element **_ov-videoconference_** {@link VideoconferenceComponent}
 * @example
 * <ov-videoconference>
 *
 *
 *	<my-chat-panel *ovChatPanel></my-chat-panel>
 * </ov-videoconference>
 *
 * <br>
 * 2. Adding it to an element as child of the element tagged with the {@link ToolbarDirective}
 * @example
 * <ov-videoconference>
 * 	<my-panel *ovPanel>
 *		<my-chat-panel *ovChatPanel></my-chat-panel>
 * 	</my-panel>
 * </ov-videoconference>
 *
 * <div class="info-container">
 * 	<span>INFO:</span>
 * 	You also can use the default components  adsada dasda d asd
 * </div>
 *
 */

@Directive({
	selector: '[ovStream]'
})
export class StreamDirective {
	constructor(public template: TemplateRef<any>, public container: ViewContainerRef) {}
}
