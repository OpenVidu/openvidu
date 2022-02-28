import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'ov-avatar-profile',
	template: `
    <div class="poster" [ngStyle]="{ 'background-color': color }">
      <span id="poster-text">{{letter}}</span>
    </div>
  `,
  styleUrls: ['./avatar-profile.component.css']
})
export class AvatarProfileComponent implements OnInit {

  color: string;

  @Input() letter;

  constructor() { }

  ngOnInit(): void {
		this.color = `hsl(${Math.random() * 360}, 100%, 75%)`;
	}

}
