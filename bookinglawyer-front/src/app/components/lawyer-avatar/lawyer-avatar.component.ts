import { Component, Input, OnChanges, SimpleChanges } from "@angular/core";

@Component({
  selector: "app-lawyer-avatar",
  templateUrl: "./lawyer-avatar.component.html",
  styleUrl: "./lawyer-avatar.component.css",
})
export class LawyerAvatarComponent implements OnChanges {
  @Input() photoUrl?: string | null;
  @Input() name = "";
  photoError = false;

  ngOnChanges(changes: SimpleChanges) {
    if (changes["photoUrl"]) this.photoError = false;
  }
}
