import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LunarYear } from './lunar-year.model';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-lunar-year',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './lunar-year.component.html',
    styleUrls: ['./lunar-year.component.css']
})
export class LunarYearComponent implements OnInit {
    days: number[] = [];
    months: number[] = [];
    years: number[] = [];

    selectedDay: number = 15;
    selectedMonth: number = 5;
    selectedYear: number = 1986;

    lunarResult: any = null;

    constructor() { }

    ngOnInit(): void {
        // Populate Days
        for (let i = 1; i <= 31; i++) {
            this.days.push(i);
        }
        // Populate Months
        for (let i = 1; i <= 12; i++) {
            this.months.push(i);
        }
        // Populate Years (e.g., 1900 to 2100)
        for (let i = 1900; i <= 2100; i++) {
            this.years.push(i);
        }
    }

    convert() {
        const lunar = new LunarYear(this.selectedDay, this.selectedMonth, this.selectedYear);
        this.lunarResult = lunar.findLunarYearDetail();
    }
}
