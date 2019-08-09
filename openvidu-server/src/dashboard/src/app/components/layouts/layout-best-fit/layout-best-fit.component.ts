import { Component, ViewEncapsulation } from '@angular/core';
import { LayoutBaseComponent } from '../layout-base/layout-base.component';

@Component({
  selector: 'app-layout-best-fit',
  templateUrl: '../layout-base/layout-base.component.html',
  styleUrls: ['../layout-base/layout-base.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class LayoutBestFitComponent extends LayoutBaseComponent {

  layoutOptions = {
    maxRatio: 3 / 2,      // The narrowest ratio that will be used (default 2x3)
    minRatio: 9 / 16,     // The widest ratio that will be used (default 16x9)
    fixedRatio: false,    /* If this is true then the aspect ratio of the video is maintained
      and minRatio and maxRatio are ignored (default false) */
    bigClass: 'OV_big',   // The class to add to elements that should be sized bigger
    bigPercentage: 0.8,   // The maximum percentage of space the big ones should take up
    bigFixedRatio: false, // fixedRatio for the big ones
    bigMaxRatio: 3 / 2,   // The narrowest ratio to use for the big elements (default 2x3)
    bigMinRatio: 9 / 16,  // The widest ratio to use for the big elements (default 16x9)
    bigFirst: true,       // Whether to place the big one in the top left (true) or bottom right
    animate: true,        // Whether you want to animate the transitions
    vertical: undefined   // Whether to show small videos at the side or at the bottom
  };

}
