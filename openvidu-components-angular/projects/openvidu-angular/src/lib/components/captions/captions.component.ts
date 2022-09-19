import {
	ChangeDetectionStrategy,
	ChangeDetectorRef,
	Component,
	ElementRef,
	OnInit,
	QueryList,
	ViewChild,
	ViewChildren
} from '@angular/core';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { PanelSettingsOptions, PanelType } from '../../models/panel.model';
import { PanelEvent, PanelService } from '../../services/panel/panel.service';
import { DocumentService } from '../../services/document/document.service';
import { MediaChange } from '@angular/flex-layout';

//TODO: Remove when speech to text is integrated
// import { LoremIpsum } from 'lorem-ipsum';

/**
 * @internal
 */
@Component({
	selector: 'ov-captions',
	templateUrl: './captions.component.html',
	styleUrls: ['./captions.component.css'],
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class CaptionsComponent implements OnInit {
	@ViewChild('textContainer') textContainer: ElementRef;

	@ViewChildren('captionElement') captionElementsRef: QueryList<ElementRef>;
	/**
	 * @ignore
	 */
	subtitleText: string;
	/**
	 * @ignore
	 */
	screenSize: string;
	/**
	 * @ignore
	 */
	settingsPanelOpened: boolean;
	private screenSizeSub: Subscription;
	private panelTogglingSubscription: Subscription;
	interval: NodeJS.Timer;

	fakeEvent: Observable<{ connectionId: string; partial: string; text?: string }>;

	captionElements: { connectionId: string; author: string; text: string }[] = [];

	//TODO: Remove when speech to text is integrated
	private sample = [
		{ connectionId: '1', partial: 'frente' },
		{ connectionId: '1', partial: 'friends' },
		{ connectionId: '1', partial: 'friends' },
		{ connectionId: '1', partial: 'friends estilizado' },
		{ connectionId: '1', partial: 'friends estilizado' },
		{ connectionId: '1', partial: 'friends estilizado' },
		{ connectionId: '1', partial: 'friends estilizado' },
		{ connectionId: '1', partial: 'friends estilizado efe' },
		{ connectionId: '1', partial: 'friends estilizado efe' },
		{ connectionId: '1', partial: 'friends estilizado efe erre' },
		{ connectionId: '1', partial: 'friends estilizado efe erre' },
		{ connectionId: '1', partial: 'friends estilizado efe erre' },
		{ connectionId: '1', partial: 'friends estilizado efe el rey y' },
		{ connectionId: '1', partial: 'friends estilizado efe el rey y' },
		{ connectionId: '1', partial: 'friends estilizado efe el rey y he' },
		{ connectionId: '1', partial: 'friends estilizado efe el rey y he' },
		{ connectionId: '1', partial: 'friends estilizado efe el rey y he' },
		{ connectionId: '1', partial: 'friends estilizado efe el rey y he' },
		{ connectionId: '1', partial: 'friends estilizado efe el rey y en' },
		{ connectionId: '1', partial: 'friends estilizado efe el rey y en' },
		{ connectionId: '1', partial: 'friends estilizado efe el rey y en de' },
		{ connectionId: '1', partial: 'friends estilizado efe el rey y en de' },
		{ connectionId: '1', partial: 'friends estilizado efe el rey y en de' },
		{ connectionId: '1', partial: 'friends estilizado efe el rey y en de' },
		{ connectionId: '1', partial: 'friends estilizado efe el rey y en ese' },
		{ connectionId: '1', partial: 'friends estilizado efe el rey y en ese' },
		{ connectionId: '1', partial: 'friends estilizado efe el rey y en ese' },
		{ connectionId: '1', partial: 'friends estilizado efe el rey y en ese' },
		{ connectionId: '1', partial: 'friends estilizado efe el rey y en ese' },
		{ connectionId: '1', partial: 'friends estilizado efe el rey y en ese también' },
		{ connectionId: '1', partial: 'friends estilizado efe el rey y en ese también' },
		{ connectionId: '1', partial: 'friends estilizado efe el rey y en ese también conocida como' },
		{ connectionId: '1', partial: 'friends estilizado efe el rey y en ese también conocida como' },
		{ connectionId: '1', partial: 'friends estilizado efe el rey y en ese también conocida como' },
		{ connectionId: '1', partial: 'friends estilizado efe el rey y en ese también conocida en hispanoamérica' },
		{ connectionId: '1', partial: 'friends estilizado efe el rey y en ese también conocida en hispanoamérica' },
		{ connectionId: '1', partial: 'friends estilizado efe el rey y en ese también conocida en hispanoamérica' },
		{ connectionId: '1', partial: 'friends estilizado efe el rey y en ese también conocida en hispanoamérica como' },
		{ connectionId: '1', partial: 'friends estilizado efe el rey y en ese también conocida en hispanoamérica como' },
		{ connectionId: '1', partial: 'friends estilizado efe el rey y en ese también conocida en hispanoamérica como' },
		{ connectionId: '1', partial: 'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos' },
		{ connectionId: '1', partial: 'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos' },
		{ connectionId: '1', partial: 'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos y' },
		{ connectionId: '1', partial: 'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos y' },
		{ connectionId: '1', partial: 'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos y' },
		{ connectionId: '1', partial: 'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos y en' },
		{ connectionId: '1', partial: 'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos y en' },
		{ connectionId: '1', partial: 'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos y en españa' },
		{ connectionId: '1', partial: 'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos y en españa' },
		{
			connectionId: '1',
			partial: 'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos y en españa como'
		},
		{
			connectionId: '1',
			partial: 'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos y en españa como'
		},
		{
			connectionId: '1',
			partial: 'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos y en españa como'
		},
		{
			connectionId: '1',
			partial: 'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos y en españa como'
		},
		{
			connectionId: '1',
			partial: 'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos y en españa como'
		},
		{
			connectionId: '1',
			partial: 'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos y en españa como'
		},
		{
			connectionId: '1',
			partial: 'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos y en españa como'
		},
		{
			connectionId: '1',
			partial: 'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos y en españa como'
		},
		{
			connectionId: '1',
			partial: 'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos y en españa como colegas'
		},
		{
			connectionId: '1',
			partial: 'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos y en españa como colegas'
		},
		{
			connectionId: '1',
			partial: 'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos y en españa como colegas'
		},
		{
			connectionId: '1',
			partial: 'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos y en españa como colegas'
		},
		{
			connectionId: '1',
			partial: 'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos y en españa como colegas'
		},
		{
			connectionId: '1',
			partial: 'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos y en españa como colegas'
		},
		{
			connectionId: '1',
			partial: 'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos y en españa como colegas'
		},
		{
			connectionId: '1',
			partial: 'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos y en españa como colegas'
		},
		{
			connectionId: '1',
			partial: 'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos y en españa como colegas'
		},
		{
			connectionId: '1',
			partial:
				'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos y en españa como colegas durante la'
		},
		{
			connectionId: '1',
			partial:
				'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos y en españa como colegas durante la'
		},
		{
			connectionId: '1',
			partial:
				'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos y en españa como colegas durante la'
		},
		{
			connectionId: '1',
			partial:
				'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos y en españa como colegas durante la temporada'
		},
		{
			connectionId: '1',
			partial:
				'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos y en españa como colegas durante la temporada'
		},
		{
			connectionId: '1',
			partial:
				'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos y en españa como colegas durante la temporada'
		},
		{
			connectionId: '1',
			partial:
				'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos y en españa como colegas durante la temporada'
		},
		{
			connectionId: '1',
			partial:
				'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos y en españa como colegas durante la temporada uno'
		},
		{
			connectionId: '1',
			partial:
				'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos y en españa como colegas durante la temporada uno'
		},
		{
			connectionId: '1',
			partial:
				'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos y en españa como colegas durante la temporada uno'
		},
		{
			connectionId: '1',
			partial:
				'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos y en españa como colegas durante la temporada uno es una'
		},
		{
			connectionId: '1',
			partial:
				'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos y en españa como colegas durante la temporada uno es una'
		},
		{
			connectionId: '1',
			partial:
				'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos y en españa como colegas durante la temporada uno es una serie'
		},
		{
			connectionId: '1',
			partial:
				'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos y en españa como colegas durante la temporada uno es una serie'
		},
		{
			connectionId: '1',
			partial:
				'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos y en españa como colegas durante la temporada uno es una serie'
		},
		{
			connectionId: '1',
			partial:
				'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos y en españa como colegas durante la temporada uno es una serie de televisión'
		},
		{
			connectionId: '1',
			partial:
				'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos y en españa como colegas durante la temporada uno es una serie de televisión'
		},
		{
			connectionId: '1',
			partial:
				'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos y en españa como colegas durante la temporada uno es una serie de televisión'
		},
		{
			connectionId: '1',
			partial:
				'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos y en españa como colegas durante la temporada uno es una serie de televisión'
		},
		{
			connectionId: '1',
			partial:
				'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos y en españa como colegas durante la temporada uno es una serie de televisión'
		},
		{
			connectionId: '1',
			partial:
				'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos y en españa como colegas durante la temporada uno es una serie de televisión'
		},
		{
			connectionId: '1',
			partial:
				'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos y en españa como colegas durante la temporada uno es una serie de televisión'
		},
		{
			connectionId: '1',
			partial:
				'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos y en españa como colegas durante la temporada uno es una serie de televisión estadounidense'
		},
		{
			connectionId: '1',
			partial:
				'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos y en españa como colegas durante la temporada uno es una serie de televisión estadounidense'
		},
		{
			connectionId: '1',
			partial:
				'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos y en españa como colegas durante la temporada uno es una serie de televisión estadounidense'
		},
		{
			connectionId: '1',
			partial:
				'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos y en españa como colegas durante la temporada uno es una serie de televisión estadounidense'
		},
		{
			connectionId: '1',
			partial:
				'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos y en españa como colegas durante la temporada uno es una serie de televisión estadounidense'
		},
		{
			connectionId: '1',
			partial:
				'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos y en españa como colegas durante la temporada uno es una serie de televisión estadounidense'
		},
		{
			connectionId: '1',
			partial:
				'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos y en españa como colegas durante la temporada uno es una serie de televisión estadounidense'
		},
		{
			connectionId: '1',
			partial:
				'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos y en españa como colegas durante la temporada uno es una serie de televisión estadounidense'
		},
		{
			connectionId: '1',
			partial:
				'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos y en españa como colegas durante la temporada uno es una serie de televisión estadounidense'
		},
		{
			connectionId: '1',
			partial:
				'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos y en españa como colegas durante la temporada uno es una serie de televisión estadounidense crear productos'
		},
		{
			connectionId: '1',
			partial:
				'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos y en españa como colegas durante la temporada uno es una serie de televisión estadounidense crear productos'
		},
		{
			connectionId: '1',
			partial:
				'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos y en españa como colegas durante la temporada uno es una serie de televisión estadounidense crear productos'
		},
		{
			connectionId: '1',
			partial:
				'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos y en españa como colegas durante la temporada uno es una serie de televisión estadounidense creado y'
		},
		{
			connectionId: '1',
			partial:
				'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos y en españa como colegas durante la temporada uno es una serie de televisión estadounidense creado y'
		},
		{
			connectionId: '1',
			partial:
				'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos y en españa como colegas durante la temporada uno es una serie de televisión estadounidense creado y producida por'
		},
		{
			connectionId: '1',
			partial:
				'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos y en españa como colegas durante la temporada uno es una serie de televisión estadounidense creado y producida por'
		},
		{
			connectionId: '1',
			partial:
				'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos y en españa como colegas durante la temporada uno es una serie de televisión estadounidense creado y producida por'
		},
		{
			connectionId: '1',
			partial:
				'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos y en españa como colegas durante la temporada uno es una serie de televisión estadounidense creado y producida por'
		},
		{
			connectionId: '1',
			partial:
				'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos y en españa como colegas durante la temporada uno es una serie de televisión estadounidense creado y producida por'
		},
		{
			connectionId: '1',
			partial:
				'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos y en españa como colegas durante la temporada uno es una serie de televisión estadounidense creado y producida por'
		},
		{
			connectionId: '1',
			partial:
				'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos y en españa como colegas durante la temporada uno es una serie de televisión estadounidense creado y producida por'
		},
		{
			connectionId: '1',
			partial:
				'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos y en españa como colegas durante la temporada uno es una serie de televisión estadounidense creado y producida por mayor'
		},
		{
			connectionId: '1',
			partial:
				'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos y en españa como colegas durante la temporada uno es una serie de televisión estadounidense creado y producida por mayor'
		},
		{
			connectionId: '1',
			partial:
				'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos y en españa como colegas durante la temporada uno es una serie de televisión estadounidense creado y producida por mayor'
		},
		{
			connectionId: '1',
			partial:
				'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos y en españa como colegas durante la temporada uno es una serie de televisión estadounidense creado y producida por mark'
		},
		{
			connectionId: '1',
			partial:
				'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos y en españa como colegas durante la temporada uno es una serie de televisión estadounidense creado y producida por mark'
		},
		{
			connectionId: '1',
			partial:
				'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos y en españa como colegas durante la temporada uno es una serie de televisión estadounidense creado y producida por marta'
		},
		{
			connectionId: '1',
			partial:
				'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos y en españa como colegas durante la temporada uno es una serie de televisión estadounidense creado y producida por marta'
		},
		{
			connectionId: '1',
			partial:
				'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos y en españa como colegas durante la temporada uno es una serie de televisión estadounidense creado y producida por marta'
		},
		{
			connectionId: '1',
			partial:
				'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos y en españa como colegas durante la temporada uno es una serie de televisión estadounidense creado y producida por marta'
		},
		{
			connectionId: '1',
			partial:
				'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos y en españa como colegas durante la temporada uno es una serie de televisión estadounidense creado y producida por marta'
		},
		{
			connectionId: '1',
			partial:
				'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos y en españa como colegas durante la temporada uno es una serie de televisión estadounidense creado y producida por marta kaufman'
		},
		{
			connectionId: '1',
			partial:
				'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos y en españa como colegas durante la temporada uno es una serie de televisión estadounidense creado y producida por marta kaufman'
		},
		{
			connectionId: '1',
			partial:
				'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos y en españa como colegas durante la temporada uno es una serie de televisión estadounidense creado y producida por marta kaufman'
		},
		{
			connectionId: '1',
			partial:
				'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos y en españa como colegas durante la temporada uno es una serie de televisión estadounidense creado y producida por marta kaufman'
		},
		{
			connectionId: '1',
			partial:
				'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos y en españa como colegas durante la temporada uno es una serie de televisión estadounidense creado y producida por marta kaufman'
		},
		{
			connectionId: '1',
			partial:
				'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos y en españa como colegas durante la temporada uno es una serie de televisión estadounidense creado y producida por marta kaufman y la'
		},
		{
			connectionId: '1',
			partial:
				'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos y en españa como colegas durante la temporada uno es una serie de televisión estadounidense creado y producida por marta kaufman y la'
		},
		{
			connectionId: '1',
			partial:
				'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos y en españa como colegas durante la temporada uno es una serie de televisión estadounidense creado y producida por marta kaufman y la'
		},
		{
			connectionId: '1',
			partial:
				'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos y en españa como colegas durante la temporada uno es una serie de televisión estadounidense creado y producida por marta kaufman y la'
		},
		{
			connectionId: '1',
			partial:
				'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos y en españa como colegas durante la temporada uno es una serie de televisión estadounidense creado y producida por marta kaufman y la'
		},
		{
			connectionId: '1',
			partial:
				'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos y en españa como colegas durante la temporada uno es una serie de televisión estadounidense creado y producida por marta kaufman y lápiz'
		},
		{
			connectionId: '1',
			partial:
				'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos y en españa como colegas durante la temporada uno es una serie de televisión estadounidense creado y producida por marta kaufman y lápiz'
		},
		{
			connectionId: '1',
			partial:
				'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos y en españa como colegas durante la temporada uno es una serie de televisión estadounidense creado y producida por marta kaufman y lápiz cree'
		},
		{
			connectionId: '1',
			partial:
				'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos y en españa como colegas durante la temporada uno es una serie de televisión estadounidense creado y producida por marta kaufman y lápiz cree'
		},
		{
			connectionId: '1',
			partial:
				'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos y en españa como colegas durante la temporada uno es una serie de televisión estadounidense creado y producida por marta kaufman y lápiz cree'
		},
		{
			connectionId: '1',
			partial:
				'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos y en españa como colegas durante la temporada uno es una serie de televisión estadounidense creado y producida por marta kaufman y lápiz cree'
		},
		{
			connectionId: '1',
			partial:
				'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos y en españa como colegas durante la temporada uno es una serie de televisión estadounidense creado y producida por marta kaufman y lápiz cree'
		},
		{
			connectionId: '1',
			partial:
				'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos y en españa como colegas durante la temporada uno es una serie de televisión estadounidense creado y producida por marta kaufman y lápiz creen se'
		},
		{
			connectionId: '1',
			partial:
				'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos y en españa como colegas durante la temporada uno es una serie de televisión estadounidense creado y producida por marta kaufman y lápiz creen se'
		},
		{
			connectionId: '1',
			partial:
				'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos y en españa como colegas durante la temporada uno es una serie de televisión estadounidense creado y producida por marta kaufman y lápiz creen se'
		},
		{
			connectionId: '1',
			partial:
				'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos y en españa como colegas durante la temporada uno es una serie de televisión estadounidense creado y producida por marta kaufman y lápiz creen se'
		},
		{
			connectionId: '1',
			partial:
				'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos y en españa como colegas durante la temporada uno es una serie de televisión estadounidense creado y producida por marta kaufman y lápiz creen se'
		},
		{
			connectionId: '1',
			partial:
				'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos y en españa como colegas durante la temporada uno es una serie de televisión estadounidense creado y producida por marta kaufman y lápiz creen se'
		},
		{
			connectionId: '1',
			partial:
				'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos y en españa como colegas durante la temporada uno es una serie de televisión estadounidense creado y producida por marta kaufman y lápiz creen se'
		},
		{
			connectionId: '1',
			partial:
				'friends estilizado efe el rey y en ese también conocida en hispanoamérica como amigos y en españa como colegas durante la temporada uno es una serie de televisión estadounidense creado y producida por marta kaufman y lápiz creen se'
		},
		{
			connectionId: '1',
			text: 'friends estilizado efe erre y ene de ese también conocida en hispanoamérica como amigos y en españa como colegas durante la temporada uno es una serie de televisión estadounidense y producida por marta kaufman y la creen se emitió'
		},
		{ connectionId: '2', partial: 'la' },
		{ connectionId: '2', partial: 'primera vez en' },
		{ connectionId: '2', partial: 'primera vez en' },
		{ connectionId: '2', partial: 'a veces vendidos' },
		{ connectionId: '2', partial: 'a veces vendidos' },
		{ connectionId: '2', partial: 'a veces vendidos' },
		{ connectionId: '2', partial: 'a veces vendidos' },
		{ connectionId: '2', partial: 'a veces vendidos' },
		{ connectionId: '2', partial: 'a veces vendidos de septiembre' },
		{ connectionId: '2', partial: 'a veces vendidos de septiembre' },
		{ connectionId: '2', partial: 'a veces vendidos de septiembre de' },
		{ connectionId: '2', partial: 'a veces vendidos de septiembre de' },
		{ connectionId: '2', partial: 'a veces vendidos de septiembre de' },
		{ connectionId: '2', partial: 'a veces vendidos de septiembre de mil novecientos' },
		{ connectionId: '2', partial: 'a veces vendidos de septiembre de mil novecientos' },
		{ connectionId: '2', partial: 'a veces vendidos de septiembre de mil novecientos' },
		{ connectionId: '2', partial: 'a veces vendidos de septiembre de mil novecientos' },
		{ connectionId: '2', partial: 'a veces vendidos de septiembre de mil novecientos' },
		{ connectionId: '2', partial: 'a veces vendidos de septiembre de mil novecientos noventa' },
		{ connectionId: '2', partial: 'a veces vendidos de septiembre de mil novecientos noventa' },
		{ connectionId: '2', partial: 'a veces vendidos de septiembre de mil novecientos noventa y cuatro' },
		{ connectionId: '2', partial: 'a veces vendidos de septiembre de mil novecientos noventa y cuatro' },
		{ connectionId: '2', partial: 'a veces vendidos de septiembre de mil novecientos noventa y cuatro' },
		{ connectionId: '2', partial: 'a veces vendidos de septiembre de mil novecientos noventa y cuatro' },
		{ connectionId: '2', partial: 'a veces vendidos de septiembre de mil novecientos noventa y cuatro' },
		{ connectionId: '2', partial: 'a veces vendidos de septiembre de mil novecientos noventa y cuatro por' },
		{ connectionId: '2', partial: 'a veces vendidos de septiembre de mil novecientos noventa y cuatro por' },
		{ connectionId: '2', partial: 'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la academia' },
		{ connectionId: '2', partial: 'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la academia' },
		{ connectionId: '2', partial: 'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la academia' },
		{ connectionId: '2', partial: 'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena de' },
		{ connectionId: '2', partial: 'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena de' },
		{ connectionId: '2', partial: 'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en eventos' },
		{ connectionId: '2', partial: 'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en eventos' },
		{ connectionId: '2', partial: 'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en' },
		{ connectionId: '2', partial: 'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en' },
		{ connectionId: '2', partial: 'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en' },
		{ connectionId: '2', partial: 'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en' },
		{ connectionId: '2', partial: 'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en' },
		{ connectionId: '2', partial: 'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena de veces y' },
		{ connectionId: '2', partial: 'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena de veces y' },
		{ connectionId: '2', partial: 'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena de veces y' },
		{
			connectionId: '2',
			partial: 'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena de veces y términos y'
		},
		{
			connectionId: '2',
			partial: 'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena de veces y términos y'
		},
		{ connectionId: '2', partial: 'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de' },
		{ connectionId: '2', partial: 'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de' },
		{
			connectionId: '2',
			partial: 'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil'
		},
		{
			connectionId: '2',
			partial: 'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil'
		},
		{
			connectionId: '2',
			partial: 'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil'
		},
		{
			connectionId: '2',
			partial: 'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil'
		},
		{
			connectionId: '2',
			partial: 'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatrocientos'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatrocientos'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatrocientos'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro las'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro las'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que recibieron'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que recibieron'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que recibieron'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que recibieron matarnos'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que recibieron matarnos'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york sucede en'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york sucede en'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york suceden tanto'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york suceden tanto'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york suceden tanto'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york suceden tanto'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york suceden tanto'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york suceden tanto unos como'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york suceden tanto unos como'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york suceden tanto unos como'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york suceden tanto buenos como malos'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york suceden tanto buenos como malos'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york suceden tanto buenos como malos momentos'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york suceden tanto buenos como malos momentos'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york suceden tanto buenos como malos momentos'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york suceden tanto buenos como malos momentos'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york suceden tanto buenos como malos momentos'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york suceden tanto buenos como malos momentos'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york suceden tanto buenos como malos momentos'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york suceden tanto buenos como malos momentos pero'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york suceden tanto buenos como malos momentos pero'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york suceden tanto buenos como malos momentos pero'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york suceden tanto buenos como malos momentos pero con'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york suceden tanto buenos como malos momentos pero con'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york suceden tanto buenos como malos momentos pero con una'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york suceden tanto buenos como malos momentos pero con una'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york suceden tanto buenos como malos momentos pero con una'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york suceden tanto buenos como malos momentos pero con una'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york suceden tanto buenos como malos momentos pero con una'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york suceden tanto buenos como malos momentos pero con una crítica'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york suceden tanto buenos como malos momentos pero con una crítica'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york suceden tanto buenos como malos momentos pero con una crítica cómica'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york suceden tanto buenos como malos momentos pero con una crítica cómica'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york suceden tanto buenos como malos momentos pero con una crítica cómica'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york suceden tanto buenos como malos momentos pero con una crítica cómica los'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york suceden tanto buenos como malos momentos pero con una crítica cómica los'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york suceden tanto buenos como malos momentos pero con una crítica cómica los hechos más'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york suceden tanto buenos como malos momentos pero con una crítica cómica los hechos más'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york suceden tanto buenos como malos momentos pero con una crítica cómica los hechos más'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york suceden tanto buenos como malos momentos pero con una crítica cómica los hechos más'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york suceden tanto buenos como malos momentos pero con una crítica cómica los hechos más'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york suceden tanto buenos como malos momentos pero con una crítica cómica los hechos más'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york suceden tanto buenos como malos momentos pero con una crítica cómica los hechos más'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york suceden tanto buenos como malos momentos pero con una crítica cómica los hechos más trascendentales de'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york suceden tanto buenos como malos momentos pero con una crítica cómica los hechos más trascendentales de'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york suceden tanto buenos como malos momentos pero con una crítica cómica los hechos más trascendentales de'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york suceden tanto buenos como malos momentos pero con una crítica cómica los hechos más trascendentales de la'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york suceden tanto buenos como malos momentos pero con una crítica cómica los hechos más trascendentales de la'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york suceden tanto buenos como malos momentos pero con una crítica cómica los hechos más trascendentales de la autoridad'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york suceden tanto buenos como malos momentos pero con una crítica cómica los hechos más trascendentales de la autoridad'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york suceden tanto buenos como malos momentos pero con una crítica cómica los hechos más trascendentales de la actualidad y'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york suceden tanto buenos como malos momentos pero con una crítica cómica los hechos más trascendentales de la actualidad y'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york suceden tanto buenos como malos momentos pero con una crítica cómica los hechos más trascendentales de la actualidad y'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york suceden tanto buenos como malos momentos pero con una crítica cómica los hechos más trascendentales de la autoridad inmediatamente'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york suceden tanto buenos como malos momentos pero con una crítica cómica los hechos más trascendentales de la autoridad inmediatamente'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york suceden tanto buenos como malos momentos pero con una crítica cómica los hechos más trascendentales de la autoridad inmediatamente'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york suceden tanto buenos como malos momentos pero con una crítica cómica los hechos más trascendentales de la autoridad inmediatamente'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york suceden tanto buenos como malos momentos pero con una crítica cómica los hechos más trascendentales de la autoridad inmediatamente'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york suceden tanto buenos como malos momentos pero con una crítica cómica los hechos más trascendentales de la autoridad inmediatamente'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york suceden tanto buenos como malos momentos pero con una crítica cómica los hechos más trascendentales de la autoridad inmediatamente'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york suceden tanto buenos como malos momentos pero con una crítica cómica los hechos más trascendentales de la autoridad inmediatamente después del'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york suceden tanto buenos como malos momentos pero con una crítica cómica los hechos más trascendentales de la autoridad inmediatamente después del'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york suceden tanto buenos como malos momentos pero con una crítica cómica los hechos más trascendentales de la autoridad inmediatamente después del éxito de'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york suceden tanto buenos como malos momentos pero con una crítica cómica los hechos más trascendentales de la autoridad inmediatamente después del éxito de'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york suceden tanto buenos como malos momentos pero con una crítica cómica los hechos más trascendentales de la autoridad inmediatamente después del éxito de'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york suceden tanto buenos como malos momentos pero con una crítica cómica los hechos más trascendentales de la autoridad inmediatamente después del éxito de su'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york suceden tanto buenos como malos momentos pero con una crítica cómica los hechos más trascendentales de la autoridad inmediatamente después del éxito de su'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york suceden tanto buenos como malos momentos pero con una crítica cómica los hechos más trascendentales de la autoridad inmediatamente después del éxito de su país'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york suceden tanto buenos como malos momentos pero con una crítica cómica los hechos más trascendentales de la autoridad inmediatamente después del éxito de su país'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york suceden tanto buenos como malos momentos pero con una crítica cómica los hechos más trascendentales de la autoridad inmediatamente después del éxito de su país'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york suceden tanto buenos como malos momentos pero con una crítica cómica los hechos más trascendentales de la autoridad inmediatamente después del éxito de su país el'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york suceden tanto buenos como malos momentos pero con una crítica cómica los hechos más trascendentales de la autoridad inmediatamente después del éxito de su país el'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york suceden tanto buenos como malos momentos pero con una crítica cómica los hechos más trascendentales de la autoridad inmediatamente después del éxito de su país el programa'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york suceden tanto buenos como malos momentos pero con una crítica cómica los hechos más trascendentales de la autoridad inmediatamente después del éxito de su país el programa'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york suceden tanto buenos como malos momentos pero con una crítica cómica los hechos más trascendentales de la autoridad inmediatamente después del éxito de su país el programa'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york suceden tanto buenos como malos momentos pero con una crítica cómica los hechos más trascendentales de la autoridad inmediatamente después del éxito de su país el programa'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york suceden tanto buenos como malos momentos pero con una crítica cómica los hechos más trascendentales de la autoridad inmediatamente después del éxito de su país el programa'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york suceden tanto buenos como malos momentos pero con una crítica cómica los hechos más trascendentales de la autoridad inmediatamente después del éxito de su país el programa comenzó'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york suceden tanto buenos como malos momentos pero con una crítica cómica los hechos más trascendentales de la autoridad inmediatamente después del éxito de su país el programa comenzó'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york suceden tanto buenos como malos momentos pero con una crítica cómica los hechos más trascendentales de la autoridad inmediatamente después del éxito de su país el programa comenzó su'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york suceden tanto buenos como malos momentos pero con una crítica cómica los hechos más trascendentales de la autoridad inmediatamente después del éxito de su país el programa comenzó su'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york suceden tanto buenos como malos momentos pero con una crítica cómica los hechos más trascendentales de la autoridad inmediatamente después del éxito de su país el programa comenzó su'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york suceden tanto buenos como malos momentos pero con una crítica cómica los hechos más trascendentales de la autoridad inmediatamente después del éxito de su país el programa comenzó su difusión'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york suceden tanto buenos como malos momentos pero con una crítica cómica los hechos más trascendentales de la autoridad inmediatamente después del éxito de su país el programa comenzó su difusión'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york suceden tanto buenos como malos momentos pero con una crítica cómica los hechos más trascendentales de la autoridad inmediatamente después del éxito de su país el programa comenzó su difusión por'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york suceden tanto buenos como malos momentos pero con una crítica cómica los hechos más trascendentales de la autoridad inmediatamente después del éxito de su país el programa comenzó su difusión por'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york suceden tanto buenos como malos momentos pero con una crítica cómica los hechos más trascendentales de la autoridad inmediatamente después del éxito de su país el programa comenzó su difusión por todo el'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york suceden tanto buenos como malos momentos pero con una crítica cómica los hechos más trascendentales de la autoridad inmediatamente después del éxito de su país el programa comenzó su difusión por todo el'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york suceden tanto buenos como malos momentos pero con una crítica cómica los hechos más trascendentales de la autoridad inmediatamente después del éxito de su país el programa comenzó su difusión por todo el'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york suceden tanto buenos como malos momentos pero con una crítica cómica los hechos más trascendentales de la autoridad inmediatamente después del éxito de su país el programa comenzó su difusión por todo el mundo'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york suceden tanto buenos como malos momentos pero con una crítica cómica los hechos más trascendentales de la autoridad inmediatamente después del éxito de su país el programa comenzó su difusión por todo el mundo'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york suceden tanto buenos como malos momentos pero con una crítica cómica los hechos más trascendentales de la autoridad inmediatamente después del éxito de su país el programa comenzó su difusión por todo el mundo'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york suceden tanto buenos como malos momentos pero con una crítica cómica los hechos más trascendentales de la autoridad inmediatamente después del éxito de su país el programa comenzó su difusión por todo el mundo'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york suceden tanto buenos como malos momentos pero con una crítica cómica los hechos más trascendentales de la autoridad inmediatamente después del éxito de su país el programa comenzó su difusión por todo el mundo'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york suceden tanto buenos como malos momentos pero con una crítica cómica los hechos más trascendentales de la autoridad inmediatamente después del éxito de su país el programa comenzó su difusión por todo el mundo'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york suceden tanto buenos como malos momentos pero con una crítica cómica los hechos más trascendentales de la autoridad inmediatamente después del éxito de su país el programa comenzó su difusión por todo el mundo'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york suceden tanto buenos como malos momentos pero con una crítica cómica los hechos más trascendentales de la autoridad inmediatamente después del éxito de su país el programa comenzó su difusión por todo el mundo'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york suceden tanto buenos como malos momentos pero con una crítica cómica los hechos más trascendentales de la autoridad inmediatamente después del éxito de su país el programa comenzó su difusión por todo el mundo'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york suceden tanto buenos como malos momentos pero con una crítica cómica los hechos más trascendentales de la autoridad inmediatamente después del éxito de su país el programa comenzó su difusión por todo el mundo considerable'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york suceden tanto buenos como malos momentos pero con una crítica cómica los hechos más trascendentales de la autoridad inmediatamente después del éxito de su país el programa comenzó su difusión por todo el mundo considerable'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york suceden tanto buenos como malos momentos pero con una crítica cómica los hechos más trascendentales de la autoridad inmediatamente después del éxito de su país el programa comenzó su difusión por todo el mundo considerable'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york suceden tanto buenos como malos momentos pero con una crítica cómica los hechos más trascendentales de la autoridad inmediatamente después del éxito de su país el programa comenzó su difusión por todo el mundo considerable'
		},
		{
			connectionId: '2',
			partial:
				'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena en términos de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que residen en oaxaca nueva york suceden tanto buenos como malos momentos pero con una crítica cómica los hechos más trascendentales de la autoridad inmediatamente después del éxito de su país el programa comenzó su difusión por todo el mundo considerable'
		},
		{
			connectionId: '2',
			text: 'a veces vendidos de septiembre de mil novecientos noventa y cuatro por la cadena de veces y terminó en seis de mayo de dos mil cuatro la serie trata sobre la vida de un grupo de amigos que en baja tan nueva york suceden tanto buenos como malos momentos pero con una crítica cómica los hechos más trascendentales de la autoridad inmediatamente después del éxito de su país el programa comenzó su difusión por todo el mundo considerable resultados'
		}
	];

	captionsHeight = 0;

	constructor(private documentService: DocumentService, private panelService: PanelService, private cd: ChangeDetectorRef) {}

	ngOnInit(): void {
		this.subscribeToScreenSize();
		this.subscribeToPanelToggling();
		this.subscribeToTranscription();
	}

	ngOnDestroy() {
		if (this.screenSizeSub) this.screenSizeSub.unsubscribe();
		if (this.panelTogglingSubscription) this.panelTogglingSubscription.unsubscribe();
		//TODO: Unsubscribe to openvidu-browser subtitle event
		clearInterval(this.interval);
	}

	onSettingsCliked() {
		this.panelService.togglePanel(PanelType.SETTINGS, PanelSettingsOptions.SUBTITLES);
	}

	private subscribeToTranscription() {
		//TODO: Subscribe to openvidu-browser subtitle event
		this.startFakeEventWithSample();
		this.fakeEvent.subscribe((event) => {
			const text = !!event.text ? event.text : event.partial;
			this.updateCaption(event.connectionId, text);
			this.cd.markForCheck();
			this.scrollToBottom();
		});
	}
	private updateCaption(connectionId: string, text: string) {
		//TODO: Remove when speech to text is integrated
		const nicknames = new Map();
		nicknames.set('1', 'Pepe');
		nicknames.set('2', 'Mario');
		nicknames.set('3', 'Luis');
		nicknames.set('4', 'Juan');
		nicknames.set('5', 'INTERUPCION');
		// TODO End delete

		let newCaptionElements = [...this.captionElements];
		const newItem = { connectionId, author: nicknames.get(connectionId), text };

		if (newCaptionElements?.length > 0) {
			let lastItem = newCaptionElements[newCaptionElements.length - 1];
			if (lastItem.connectionId === connectionId) {
				//Last author and new author are the same. Updating the caption
				lastItem.text = text;
			} else {
				// const lastIntervention = newCaptionElements.find((item) => item.connectionId === connectionId);
				// if (!!lastIntervention) {
				// 	// The author is in the captionElements array
				// 	// adding only the new words after its intervention.
				// 	const splittedText = newItem.text.split(lastIntervention?.text)[1];
				// 	newItem.text = !!splittedText ? splittedText : newItem.text;
				// }
				newCaptionElements.push(newItem);
			}
		} else {
			newCaptionElements.push(newItem);
		}

		this.adjustCaptionsToContainer(newCaptionElements);
	}
	private adjustCaptionsToContainer(newCaptionElements: { connectionId: string; author: string; text: string }[]) {
		this.captionsHeight = 0;
		// TODO: the height is being calculated for old data
		// it should be calculated with the new caption elements
		this.captionElementsRef?.forEach((item: ElementRef) => {
			this.captionsHeight += item.nativeElement.offsetHeight;
		});


		if (newCaptionElements?.length > 3) {
			// Maximum elements exceeded. Delete first element.
			newCaptionElements.shift();
		} else if (this.captionsHeight > 240) {
			if (newCaptionElements?.length === 3) {
				// Maximum height exceeded. Delete first element.
				newCaptionElements.shift();
			} else if (newCaptionElements?.length === 2 || newCaptionElements?.length === 1) {
				newCaptionElements[0].text = newCaptionElements[0].text.slice(100);
				if (newCaptionElements[0].text.length < 100) {
					newCaptionElements.shift();
				}
			}
		}

		this.captionElements = [...newCaptionElements];
	}

	//TODO: Remove when speech to text is integrated
	private startFakeEventWithSample() {
		let index = 0;
		let event = <{ connectionId: string; partial: string; text?: string }>this.sample[index];
		const fakeEventBS = <BehaviorSubject<{ connectionId: string; partial: string; text?: string }>>new BehaviorSubject(event);
		this.fakeEvent = fakeEventBS.asObservable();

		const eventLoop = () => {
			return setInterval(() => {
				event = <{ connectionId: string; partial: string; text?: string }>this.sample[index];
				index++;

				fakeEventBS.next(event);
				if (!this.sample[index]) {
					clearInterval(this.interval);
					index = 0;
				}
			}, 180);
		};

		this.interval = eventLoop();

		//TODO: Simulating an speech event
		//TODO: Remove when speech to text is integrated
		// setInterval(() => {
		// 	clearInterval(this.interval);
		// 	const lorem = new LoremIpsum();
		// 	let times = 5;
		// 	let partial = 'BLA BLA BLA ';
		// 	const interval2 = setInterval(() => {
		// 		fakeEventBS.next({ connectionId: '5', partial });
		// 		partial += lorem.generateWords(2);
		// 		if (times <= 0) {
		// 			fakeEventBS.next({ connectionId: '5', partial, text: partial });
		// 			clearInterval(interval2);
		// 			this.interval = eventLoop();
		// 		}
		// 		times--;
		// 	}, 400);
		// }, 6000);
	}

	private subscribeToPanelToggling() {
		this.panelTogglingSubscription = this.panelService.panelOpenedObs.subscribe((ev: PanelEvent) => {
			this.settingsPanelOpened = ev.opened;
			this.cd.markForCheck();
		});
	}

	private subscribeToScreenSize() {
		this.screenSizeSub = this.documentService.screenSizeObs.subscribe((change: MediaChange[]) => {
			this.screenSize = change[0].mqAlias;
			console.log(this.screenSize);
			this.cd.markForCheck();
		});
	}

	private scrollToBottom(): void {
		// setTimeout(() => {
		try {
			this.textContainer.nativeElement.scrollTop = this.textContainer.nativeElement.scrollHeight;
		} catch (err) {}
		// }, 20);
	}
}
