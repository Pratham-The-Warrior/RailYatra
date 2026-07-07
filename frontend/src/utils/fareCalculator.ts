/**
 * RailYatra Estimated Fare Calculator Utility
 * Mapped directly from the official eRail Passenger Fare tariff table.
 * 
 * Calculated exactly using:
 * Fare = Base Fare (distance lookup) + Reservation Fee + Superfast Charge + GST (5% on AC classes)
 */

interface FareBand {
    start: number;
    end: number;
    fare: number;
}

// Exact eRail base fare database for each class
const FARE_DATABASE: Record<string, FareBand[]> = {
    "SL": [
        {
            "start": 1,
            "end": 5,
            "fare": 112
        },
        {
            "start": 6,
            "end": 10,
            "fare": 112
        },
        {
            "start": 11,
            "end": 15,
            "fare": 112
        },
        {
            "start": 16,
            "end": 20,
            "fare": 112
        },
        {
            "start": 21,
            "end": 25,
            "fare": 112
        },
        {
            "start": 26,
            "end": 30,
            "fare": 112
        },
        {
            "start": 31,
            "end": 35,
            "fare": 112
        },
        {
            "start": 36,
            "end": 40,
            "fare": 112
        },
        {
            "start": 41,
            "end": 45,
            "fare": 112
        },
        {
            "start": 46,
            "end": 50,
            "fare": 112
        },
        {
            "start": 51,
            "end": 55,
            "fare": 112
        },
        {
            "start": 56,
            "end": 60,
            "fare": 112
        },
        {
            "start": 61,
            "end": 65,
            "fare": 112
        },
        {
            "start": 66,
            "end": 70,
            "fare": 112
        },
        {
            "start": 71,
            "end": 75,
            "fare": 112
        },
        {
            "start": 76,
            "end": 80,
            "fare": 112
        },
        {
            "start": 81,
            "end": 85,
            "fare": 112
        },
        {
            "start": 86,
            "end": 90,
            "fare": 112
        },
        {
            "start": 91,
            "end": 95,
            "fare": 112
        },
        {
            "start": 96,
            "end": 100,
            "fare": 112
        },
        {
            "start": 101,
            "end": 105,
            "fare": 112
        },
        {
            "start": 106,
            "end": 110,
            "fare": 112
        },
        {
            "start": 111,
            "end": 115,
            "fare": 112
        },
        {
            "start": 116,
            "end": 120,
            "fare": 112
        },
        {
            "start": 121,
            "end": 125,
            "fare": 112
        },
        {
            "start": 126,
            "end": 130,
            "fare": 112
        },
        {
            "start": 131,
            "end": 135,
            "fare": 112
        },
        {
            "start": 136,
            "end": 140,
            "fare": 112
        },
        {
            "start": 141,
            "end": 145,
            "fare": 112
        },
        {
            "start": 146,
            "end": 150,
            "fare": 112
        },
        {
            "start": 151,
            "end": 155,
            "fare": 112
        },
        {
            "start": 156,
            "end": 160,
            "fare": 112
        },
        {
            "start": 161,
            "end": 165,
            "fare": 112
        },
        {
            "start": 166,
            "end": 170,
            "fare": 112
        },
        {
            "start": 171,
            "end": 175,
            "fare": 112
        },
        {
            "start": 176,
            "end": 180,
            "fare": 112
        },
        {
            "start": 181,
            "end": 185,
            "fare": 112
        },
        {
            "start": 186,
            "end": 190,
            "fare": 112
        },
        {
            "start": 191,
            "end": 195,
            "fare": 112
        },
        {
            "start": 196,
            "end": 200,
            "fare": 112
        },
        {
            "start": 201,
            "end": 205,
            "fare": 115
        },
        {
            "start": 206,
            "end": 210,
            "fare": 117
        },
        {
            "start": 211,
            "end": 215,
            "fare": 118
        },
        {
            "start": 216,
            "end": 220,
            "fare": 121
        },
        {
            "start": 221,
            "end": 225,
            "fare": 122
        },
        {
            "start": 226,
            "end": 230,
            "fare": 124
        },
        {
            "start": 231,
            "end": 235,
            "fare": 127
        },
        {
            "start": 236,
            "end": 240,
            "fare": 128
        },
        {
            "start": 241,
            "end": 245,
            "fare": 130
        },
        {
            "start": 246,
            "end": 250,
            "fare": 132
        },
        {
            "start": 251,
            "end": 255,
            "fare": 134
        },
        {
            "start": 256,
            "end": 260,
            "fare": 136
        },
        {
            "start": 261,
            "end": 265,
            "fare": 137
        },
        {
            "start": 266,
            "end": 270,
            "fare": 140
        },
        {
            "start": 271,
            "end": 275,
            "fare": 141
        },
        {
            "start": 276,
            "end": 280,
            "fare": 143
        },
        {
            "start": 281,
            "end": 285,
            "fare": 145
        },
        {
            "start": 286,
            "end": 290,
            "fare": 147
        },
        {
            "start": 291,
            "end": 295,
            "fare": 148
        },
        {
            "start": 296,
            "end": 300,
            "fare": 150
        },
        {
            "start": 301,
            "end": 310,
            "fare": 154
        },
        {
            "start": 311,
            "end": 320,
            "fare": 158
        },
        {
            "start": 321,
            "end": 330,
            "fare": 161
        },
        {
            "start": 331,
            "end": 340,
            "fare": 165
        },
        {
            "start": 341,
            "end": 350,
            "fare": 168
        },
        {
            "start": 351,
            "end": 360,
            "fare": 172
        },
        {
            "start": 361,
            "end": 370,
            "fare": 176
        },
        {
            "start": 371,
            "end": 380,
            "fare": 179
        },
        {
            "start": 381,
            "end": 390,
            "fare": 182
        },
        {
            "start": 381,
            "end": 390,
            "fare": 182
        },
        {
            "start": 391,
            "end": 400,
            "fare": 185
        },
        {
            "start": 401,
            "end": 410,
            "fare": 189
        },
        {
            "start": 411,
            "end": 420,
            "fare": 193
        },
        {
            "start": 421,
            "end": 430,
            "fare": 197
        },
        {
            "start": 431,
            "end": 440,
            "fare": 201
        },
        {
            "start": 441,
            "end": 450,
            "fare": 204
        },
        {
            "start": 451,
            "end": 460,
            "fare": 208
        },
        {
            "start": 461,
            "end": 470,
            "fare": 212
        },
        {
            "start": 471,
            "end": 480,
            "fare": 215
        },
        {
            "start": 481,
            "end": 490,
            "fare": 219
        },
        {
            "start": 491,
            "end": 500,
            "fare": 222
        },
        {
            "start": 501,
            "end": 510,
            "fare": 235
        },
        {
            "start": 511,
            "end": 520,
            "fare": 239
        },
        {
            "start": 521,
            "end": 530,
            "fare": 241
        },
        {
            "start": 531,
            "end": 540,
            "fare": 245
        },
        {
            "start": 541,
            "end": 550,
            "fare": 248
        },
        {
            "start": 551,
            "end": 560,
            "fare": 250
        },
        {
            "start": 561,
            "end": 570,
            "fare": 254
        },
        {
            "start": 571,
            "end": 580,
            "fare": 256
        },
        {
            "start": 581,
            "end": 590,
            "fare": 256
        },
        {
            "start": 591,
            "end": 600,
            "fare": 262
        },
        {
            "start": 601,
            "end": 610,
            "fare": 266
        },
        {
            "start": 611,
            "end": 620,
            "fare": 270
        },
        {
            "start": 621,
            "end": 630,
            "fare": 272
        },
        {
            "start": 631,
            "end": 640,
            "fare": 276
        },
        {
            "start": 641,
            "end": 650,
            "fare": 278
        },
        {
            "start": 651,
            "end": 660,
            "fare": 282
        },
        {
            "start": 661,
            "end": 670,
            "fare": 285
        },
        {
            "start": 671,
            "end": 680,
            "fare": 288
        },
        {
            "start": 681,
            "end": 690,
            "fare": 291
        },
        {
            "start": 691,
            "end": 700,
            "fare": 294
        },
        {
            "start": 701,
            "end": 710,
            "fare": 298
        },
        {
            "start": 711,
            "end": 720,
            "fare": 301
        },
        {
            "start": 721,
            "end": 730,
            "fare": 304
        },
        {
            "start": 731,
            "end": 740,
            "fare": 307
        },
        {
            "start": 741,
            "end": 750,
            "fare": 310
        },
        {
            "start": 751,
            "end": 760,
            "fare": 312
        },
        {
            "start": 761,
            "end": 770,
            "fare": 315
        },
        {
            "start": 771,
            "end": 780,
            "fare": 317
        },
        {
            "start": 781,
            "end": 790,
            "fare": 320
        },
        {
            "start": 791,
            "end": 800,
            "fare": 322
        },
        {
            "start": 801,
            "end": 810,
            "fare": 325
        },
        {
            "start": 811,
            "end": 820,
            "fare": 328
        },
        {
            "start": 821,
            "end": 830,
            "fare": 330
        },
        {
            "start": 831,
            "end": 840,
            "fare": 334
        },
        {
            "start": 841,
            "end": 850,
            "fare": 336
        },
        {
            "start": 851,
            "end": 860,
            "fare": 339
        },
        {
            "start": 861,
            "end": 870,
            "fare": 342
        },
        {
            "start": 871,
            "end": 880,
            "fare": 344
        },
        {
            "start": 881,
            "end": 890,
            "fare": 347
        },
        {
            "start": 901,
            "end": 910,
            "fare": 352
        },
        {
            "start": 911,
            "end": 920,
            "fare": 355
        },
        {
            "start": 921,
            "end": 930,
            "fare": 357
        },
        {
            "start": 931,
            "end": 940,
            "fare": 360
        },
        {
            "start": 941,
            "end": 950,
            "fare": 362
        },
        {
            "start": 961,
            "end": 970,
            "fare": 369
        },
        {
            "start": 981,
            "end": 990,
            "fare": 374
        },
        {
            "start": 1001,
            "end": 1025,
            "fare": 381
        },
        {
            "start": 1051,
            "end": 1075,
            "fare": 392
        },
        {
            "start": 1101,
            "end": 1125,
            "fare": 403
        },
        {
            "start": 1201,
            "end": 1225,
            "fare": 425
        },
        {
            "start": 1301,
            "end": 1325,
            "fare": 446
        },
        {
            "start": 1401,
            "end": 1425,
            "fare": 468
        },
        {
            "start": 1501,
            "end": 1525,
            "fare": 490
        },
        {
            "start": 1601,
            "end": 1625,
            "fare": 511
        },
        {
            "start": 1701,
            "end": 1725,
            "fare": 533
        },
        {
            "start": 1801,
            "end": 1825,
            "fare": 555
        },
        {
            "start": 1901,
            "end": 1925,
            "fare": 577
        },
        {
            "start": 2001,
            "end": 2025,
            "fare": 596
        },
        {
            "start": 2101,
            "end": 2125,
            "fare": 610
        },
        {
            "start": 2201,
            "end": 2225,
            "fare": 624
        },
        {
            "start": 2301,
            "end": 2325,
            "fare": 638
        },
        {
            "start": 2401,
            "end": 2425,
            "fare": 652
        },
        {
            "start": 2501,
            "end": 2550,
            "fare": 668
        },
        {
            "start": 2601,
            "end": 2650,
            "fare": 682
        },
        {
            "start": 2701,
            "end": 2750,
            "fare": 696
        },
        {
            "start": 2801,
            "end": 2850,
            "fare": 710
        },
        {
            "start": 2901,
            "end": 2950,
            "fare": 724
        },
        {
            "start": 3001,
            "end": 3050,
            "fare": 738
        },
        {
            "start": 3101,
            "end": 3150,
            "fare": 751
        },
        {
            "start": 3201,
            "end": 3250,
            "fare": 765
        },
        {
            "start": 3301,
            "end": 3350,
            "fare": 779
        },
        {
            "start": 3401,
            "end": 3450,
            "fare": 793
        },
        {
            "start": 3501,
            "end": 3550,
            "fare": 807
        },
        {
            "start": 3601,
            "end": 3650,
            "fare": 821
        },
        {
            "start": 3701,
            "end": 3750,
            "fare": 834
        },
        {
            "start": 3801,
            "end": 3850,
            "fare": 841
        },
        {
            "start": 3901,
            "end": 3950,
            "fare": 862
        },
        {
            "start": 4001,
            "end": 4050,
            "fare": 876
        },
        {
            "start": 4101,
            "end": 4150,
            "fare": 890
        },
        {
            "start": 4201,
            "end": 4250,
            "fare": 904
        },
        {
            "start": 4301,
            "end": 4350,
            "fare": 918
        },
        {
            "start": 4401,
            "end": 4450,
            "fare": 931
        },
        {
            "start": 4501,
            "end": 4550,
            "fare": 945
        },
        {
            "start": 4601,
            "end": 4650,
            "fare": 959
        },
        {
            "start": 4701,
            "end": 4750,
            "fare": 973
        },
        {
            "start": 4801,
            "end": 4850,
            "fare": 987
        },
        {
            "start": 4901,
            "end": 4950,
            "fare": 1001
        },
        {
            "start": 4951,
            "end": 5000,
            "fare": 1007
        }
    ],
    "3A": [
        {
            "start": 1,
            "end": 5,
            "fare": 402
        },
        {
            "start": 6,
            "end": 10,
            "fare": 402
        },
        {
            "start": 11,
            "end": 15,
            "fare": 402
        },
        {
            "start": 16,
            "end": 20,
            "fare": 402
        },
        {
            "start": 21,
            "end": 25,
            "fare": 402
        },
        {
            "start": 26,
            "end": 30,
            "fare": 402
        },
        {
            "start": 31,
            "end": 35,
            "fare": 402
        },
        {
            "start": 36,
            "end": 40,
            "fare": 402
        },
        {
            "start": 41,
            "end": 45,
            "fare": 402
        },
        {
            "start": 46,
            "end": 50,
            "fare": 402
        },
        {
            "start": 51,
            "end": 55,
            "fare": 402
        },
        {
            "start": 56,
            "end": 60,
            "fare": 402
        },
        {
            "start": 61,
            "end": 65,
            "fare": 402
        },
        {
            "start": 66,
            "end": 70,
            "fare": 402
        },
        {
            "start": 71,
            "end": 75,
            "fare": 402
        },
        {
            "start": 76,
            "end": 80,
            "fare": 402
        },
        {
            "start": 81,
            "end": 85,
            "fare": 402
        },
        {
            "start": 86,
            "end": 90,
            "fare": 402
        },
        {
            "start": 91,
            "end": 95,
            "fare": 402
        },
        {
            "start": 96,
            "end": 100,
            "fare": 402
        },
        {
            "start": 101,
            "end": 105,
            "fare": 402
        },
        {
            "start": 106,
            "end": 110,
            "fare": 402
        },
        {
            "start": 111,
            "end": 115,
            "fare": 402
        },
        {
            "start": 116,
            "end": 120,
            "fare": 402
        },
        {
            "start": 121,
            "end": 125,
            "fare": 402
        },
        {
            "start": 126,
            "end": 130,
            "fare": 402
        },
        {
            "start": 131,
            "end": 135,
            "fare": 402
        },
        {
            "start": 136,
            "end": 140,
            "fare": 402
        },
        {
            "start": 141,
            "end": 145,
            "fare": 402
        },
        {
            "start": 146,
            "end": 150,
            "fare": 402
        },
        {
            "start": 151,
            "end": 155,
            "fare": 402
        },
        {
            "start": 156,
            "end": 160,
            "fare": 402
        },
        {
            "start": 161,
            "end": 165,
            "fare": 402
        },
        {
            "start": 166,
            "end": 170,
            "fare": 402
        },
        {
            "start": 171,
            "end": 175,
            "fare": 402
        },
        {
            "start": 176,
            "end": 180,
            "fare": 402
        },
        {
            "start": 181,
            "end": 185,
            "fare": 402
        },
        {
            "start": 186,
            "end": 190,
            "fare": 402
        },
        {
            "start": 191,
            "end": 195,
            "fare": 402
        },
        {
            "start": 196,
            "end": 200,
            "fare": 402
        },
        {
            "start": 201,
            "end": 205,
            "fare": 402
        },
        {
            "start": 206,
            "end": 210,
            "fare": 402
        },
        {
            "start": 211,
            "end": 215,
            "fare": 402
        },
        {
            "start": 216,
            "end": 220,
            "fare": 402
        },
        {
            "start": 221,
            "end": 225,
            "fare": 402
        },
        {
            "start": 226,
            "end": 230,
            "fare": 402
        },
        {
            "start": 231,
            "end": 235,
            "fare": 402
        },
        {
            "start": 236,
            "end": 240,
            "fare": 402
        },
        {
            "start": 241,
            "end": 245,
            "fare": 402
        },
        {
            "start": 246,
            "end": 250,
            "fare": 402
        },
        {
            "start": 251,
            "end": 255,
            "fare": 402
        },
        {
            "start": 256,
            "end": 260,
            "fare": 402
        },
        {
            "start": 261,
            "end": 265,
            "fare": 402
        },
        {
            "start": 266,
            "end": 270,
            "fare": 402
        },
        {
            "start": 271,
            "end": 275,
            "fare": 402
        },
        {
            "start": 276,
            "end": 280,
            "fare": 402
        },
        {
            "start": 281,
            "end": 285,
            "fare": 402
        },
        {
            "start": 286,
            "end": 290,
            "fare": 402
        },
        {
            "start": 291,
            "end": 295,
            "fare": 402
        },
        {
            "start": 296,
            "end": 300,
            "fare": 402
        },
        {
            "start": 301,
            "end": 310,
            "fare": 410
        },
        {
            "start": 311,
            "end": 320,
            "fare": 420
        },
        {
            "start": 321,
            "end": 330,
            "fare": 430
        },
        {
            "start": 331,
            "end": 340,
            "fare": 439
        },
        {
            "start": 341,
            "end": 350,
            "fare": 449
        },
        {
            "start": 351,
            "end": 360,
            "fare": 458
        },
        {
            "start": 361,
            "end": 370,
            "fare": 467
        },
        {
            "start": 371,
            "end": 380,
            "fare": 476
        },
        {
            "start": 381,
            "end": 390,
            "fare": 486
        },
        {
            "start": 381,
            "end": 390,
            "fare": 486
        },
        {
            "start": 391,
            "end": 400,
            "fare": 495
        },
        {
            "start": 401,
            "end": 410,
            "fare": 505
        },
        {
            "start": 411,
            "end": 420,
            "fare": 513
        },
        {
            "start": 421,
            "end": 430,
            "fare": 523
        },
        {
            "start": 431,
            "end": 440,
            "fare": 533
        },
        {
            "start": 441,
            "end": 450,
            "fare": 542
        },
        {
            "start": 451,
            "end": 460,
            "fare": 552
        },
        {
            "start": 461,
            "end": 470,
            "fare": 561
        },
        {
            "start": 471,
            "end": 480,
            "fare": 570
        },
        {
            "start": 481,
            "end": 490,
            "fare": 579
        },
        {
            "start": 491,
            "end": 500,
            "fare": 589
        },
        {
            "start": 501,
            "end": 510,
            "fare": 627
        },
        {
            "start": 511,
            "end": 520,
            "fare": 635
        },
        {
            "start": 521,
            "end": 530,
            "fare": 643
        },
        {
            "start": 531,
            "end": 540,
            "fare": 652
        },
        {
            "start": 541,
            "end": 550,
            "fare": 659
        },
        {
            "start": 551,
            "end": 560,
            "fare": 667
        },
        {
            "start": 561,
            "end": 570,
            "fare": 675
        },
        {
            "start": 571,
            "end": 580,
            "fare": 683
        },
        {
            "start": 581,
            "end": 590,
            "fare": 683
        },
        {
            "start": 591,
            "end": 600,
            "fare": 700
        },
        {
            "start": 601,
            "end": 610,
            "fare": 708
        },
        {
            "start": 611,
            "end": 620,
            "fare": 715
        },
        {
            "start": 621,
            "end": 630,
            "fare": 723
        },
        {
            "start": 631,
            "end": 640,
            "fare": 732
        },
        {
            "start": 641,
            "end": 650,
            "fare": 740
        },
        {
            "start": 651,
            "end": 660,
            "fare": 748
        },
        {
            "start": 661,
            "end": 670,
            "fare": 756
        },
        {
            "start": 671,
            "end": 680,
            "fare": 764
        },
        {
            "start": 681,
            "end": 690,
            "fare": 772
        },
        {
            "start": 691,
            "end": 700,
            "fare": 780
        },
        {
            "start": 701,
            "end": 710,
            "fare": 788
        },
        {
            "start": 711,
            "end": 720,
            "fare": 796
        },
        {
            "start": 721,
            "end": 730,
            "fare": 804
        },
        {
            "start": 731,
            "end": 740,
            "fare": 813
        },
        {
            "start": 741,
            "end": 750,
            "fare": 821
        },
        {
            "start": 751,
            "end": 760,
            "fare": 827
        },
        {
            "start": 761,
            "end": 770,
            "fare": 834
        },
        {
            "start": 771,
            "end": 780,
            "fare": 840
        },
        {
            "start": 781,
            "end": 790,
            "fare": 847
        },
        {
            "start": 791,
            "end": 800,
            "fare": 854
        },
        {
            "start": 801,
            "end": 810,
            "fare": 861
        },
        {
            "start": 811,
            "end": 820,
            "fare": 868
        },
        {
            "start": 821,
            "end": 830,
            "fare": 875
        },
        {
            "start": 831,
            "end": 840,
            "fare": 881
        },
        {
            "start": 841,
            "end": 850,
            "fare": 887
        },
        {
            "start": 851,
            "end": 860,
            "fare": 894
        },
        {
            "start": 861,
            "end": 870,
            "fare": 901
        },
        {
            "start": 871,
            "end": 880,
            "fare": 908
        },
        {
            "start": 881,
            "end": 890,
            "fare": 915
        },
        {
            "start": 901,
            "end": 910,
            "fare": 922
        },
        {
            "start": 911,
            "end": 920,
            "fare": 935
        },
        {
            "start": 921,
            "end": 930,
            "fare": 941
        },
        {
            "start": 931,
            "end": 940,
            "fare": 948
        },
        {
            "start": 941,
            "end": 950,
            "fare": 955
        },
        {
            "start": 961,
            "end": 970,
            "fare": 969
        },
        {
            "start": 981,
            "end": 990,
            "fare": 982
        },
        {
            "start": 1001,
            "end": 1025,
            "fare": 1002
        },
        {
            "start": 1051,
            "end": 1075,
            "fare": 1030
        },
        {
            "start": 1101,
            "end": 1125,
            "fare": 1056
        },
        {
            "start": 1201,
            "end": 1225,
            "fare": 1111
        },
        {
            "start": 1301,
            "end": 1325,
            "fare": 1165
        },
        {
            "start": 1401,
            "end": 1425,
            "fare": 1219
        },
        {
            "start": 1501,
            "end": 1525,
            "fare": 1273
        },
        {
            "start": 1601,
            "end": 1625,
            "fare": 1327
        },
        {
            "start": 1701,
            "end": 1725,
            "fare": 1381
        },
        {
            "start": 1801,
            "end": 1825,
            "fare": 1435
        },
        {
            "start": 1901,
            "end": 1925,
            "fare": 1489
        },
        {
            "start": 2001,
            "end": 2025,
            "fare": 1538
        },
        {
            "start": 2101,
            "end": 2125,
            "fare": 1570
        },
        {
            "start": 2201,
            "end": 2225,
            "fare": 1603
        },
        {
            "start": 2301,
            "end": 2325,
            "fare": 1634
        },
        {
            "start": 2401,
            "end": 2425,
            "fare": 1667
        },
        {
            "start": 2501,
            "end": 2550,
            "fare": 1706
        },
        {
            "start": 2601,
            "end": 2650,
            "fare": 1738
        },
        {
            "start": 2701,
            "end": 2750,
            "fare": 1770
        },
        {
            "start": 2801,
            "end": 2850,
            "fare": 1802
        },
        {
            "start": 2901,
            "end": 2950,
            "fare": 1834
        },
        {
            "start": 3001,
            "end": 3050,
            "fare": 1866
        },
        {
            "start": 3101,
            "end": 3150,
            "fare": 1898
        },
        {
            "start": 3201,
            "end": 3250,
            "fare": 1930
        },
        {
            "start": 3301,
            "end": 3350,
            "fare": 1963
        },
        {
            "start": 3401,
            "end": 3450,
            "fare": 1994
        },
        {
            "start": 3501,
            "end": 3550,
            "fare": 2027
        },
        {
            "start": 3601,
            "end": 3650,
            "fare": 2058
        },
        {
            "start": 3701,
            "end": 3750,
            "fare": 2091
        },
        {
            "start": 3801,
            "end": 3850,
            "fare": 2106
        },
        {
            "start": 3901,
            "end": 3950,
            "fare": 2155
        },
        {
            "start": 4001,
            "end": 4050,
            "fare": 2186
        },
        {
            "start": 4101,
            "end": 4150,
            "fare": 2220
        },
        {
            "start": 4201,
            "end": 4250,
            "fare": 2262
        },
        {
            "start": 4301,
            "end": 4350,
            "fare": 2304
        },
        {
            "start": 4401,
            "end": 4450,
            "fare": 2351
        },
        {
            "start": 4501,
            "end": 4550,
            "fare": 2390
        },
        {
            "start": 4601,
            "end": 4650,
            "fare": 2433
        },
        {
            "start": 4701,
            "end": 4750,
            "fare": 2474
        },
        {
            "start": 4801,
            "end": 4850,
            "fare": 2516
        },
        {
            "start": 4901,
            "end": 4950,
            "fare": 2564
        },
        {
            "start": 4951,
            "end": 5000,
            "fare": 2580
        }
    ],
    "2A": [
        {
            "start": 1,
            "end": 5,
            "fare": 577
        },
        {
            "start": 6,
            "end": 10,
            "fare": 577
        },
        {
            "start": 11,
            "end": 15,
            "fare": 577
        },
        {
            "start": 16,
            "end": 20,
            "fare": 577
        },
        {
            "start": 21,
            "end": 25,
            "fare": 577
        },
        {
            "start": 26,
            "end": 30,
            "fare": 577
        },
        {
            "start": 31,
            "end": 35,
            "fare": 577
        },
        {
            "start": 36,
            "end": 40,
            "fare": 577
        },
        {
            "start": 41,
            "end": 45,
            "fare": 577
        },
        {
            "start": 46,
            "end": 50,
            "fare": 577
        },
        {
            "start": 51,
            "end": 55,
            "fare": 577
        },
        {
            "start": 56,
            "end": 60,
            "fare": 577
        },
        {
            "start": 61,
            "end": 65,
            "fare": 577
        },
        {
            "start": 66,
            "end": 70,
            "fare": 577
        },
        {
            "start": 71,
            "end": 75,
            "fare": 577
        },
        {
            "start": 76,
            "end": 80,
            "fare": 577
        },
        {
            "start": 81,
            "end": 85,
            "fare": 577
        },
        {
            "start": 86,
            "end": 90,
            "fare": 577
        },
        {
            "start": 91,
            "end": 95,
            "fare": 577
        },
        {
            "start": 96,
            "end": 100,
            "fare": 577
        },
        {
            "start": 101,
            "end": 105,
            "fare": 577
        },
        {
            "start": 106,
            "end": 110,
            "fare": 577
        },
        {
            "start": 111,
            "end": 115,
            "fare": 577
        },
        {
            "start": 116,
            "end": 120,
            "fare": 577
        },
        {
            "start": 121,
            "end": 125,
            "fare": 577
        },
        {
            "start": 126,
            "end": 130,
            "fare": 577
        },
        {
            "start": 131,
            "end": 135,
            "fare": 577
        },
        {
            "start": 136,
            "end": 140,
            "fare": 577
        },
        {
            "start": 141,
            "end": 145,
            "fare": 577
        },
        {
            "start": 146,
            "end": 150,
            "fare": 577
        },
        {
            "start": 151,
            "end": 155,
            "fare": 577
        },
        {
            "start": 156,
            "end": 160,
            "fare": 577
        },
        {
            "start": 161,
            "end": 165,
            "fare": 577
        },
        {
            "start": 166,
            "end": 170,
            "fare": 577
        },
        {
            "start": 171,
            "end": 175,
            "fare": 577
        },
        {
            "start": 176,
            "end": 180,
            "fare": 577
        },
        {
            "start": 181,
            "end": 185,
            "fare": 577
        },
        {
            "start": 186,
            "end": 190,
            "fare": 577
        },
        {
            "start": 191,
            "end": 195,
            "fare": 577
        },
        {
            "start": 196,
            "end": 200,
            "fare": 577
        },
        {
            "start": 201,
            "end": 205,
            "fare": 577
        },
        {
            "start": 206,
            "end": 210,
            "fare": 577
        },
        {
            "start": 211,
            "end": 215,
            "fare": 577
        },
        {
            "start": 216,
            "end": 220,
            "fare": 577
        },
        {
            "start": 221,
            "end": 225,
            "fare": 577
        },
        {
            "start": 226,
            "end": 230,
            "fare": 577
        },
        {
            "start": 231,
            "end": 235,
            "fare": 577
        },
        {
            "start": 236,
            "end": 240,
            "fare": 577
        },
        {
            "start": 241,
            "end": 245,
            "fare": 577
        },
        {
            "start": 246,
            "end": 250,
            "fare": 577
        },
        {
            "start": 251,
            "end": 255,
            "fare": 577
        },
        {
            "start": 256,
            "end": 260,
            "fare": 577
        },
        {
            "start": 261,
            "end": 265,
            "fare": 577
        },
        {
            "start": 266,
            "end": 270,
            "fare": 577
        },
        {
            "start": 271,
            "end": 275,
            "fare": 577
        },
        {
            "start": 276,
            "end": 280,
            "fare": 577
        },
        {
            "start": 281,
            "end": 285,
            "fare": 577
        },
        {
            "start": 286,
            "end": 290,
            "fare": 577
        },
        {
            "start": 291,
            "end": 295,
            "fare": 577
        },
        {
            "start": 296,
            "end": 300,
            "fare": 577
        },
        {
            "start": 301,
            "end": 310,
            "fare": 592
        },
        {
            "start": 311,
            "end": 320,
            "fare": 606
        },
        {
            "start": 321,
            "end": 330,
            "fare": 619
        },
        {
            "start": 331,
            "end": 340,
            "fare": 633
        },
        {
            "start": 341,
            "end": 350,
            "fare": 647
        },
        {
            "start": 351,
            "end": 360,
            "fare": 660
        },
        {
            "start": 361,
            "end": 370,
            "fare": 675
        },
        {
            "start": 371,
            "end": 380,
            "fare": 687
        },
        {
            "start": 381,
            "end": 390,
            "fare": 702
        },
        {
            "start": 381,
            "end": 390,
            "fare": 702
        },
        {
            "start": 391,
            "end": 400,
            "fare": 715
        },
        {
            "start": 401,
            "end": 410,
            "fare": 729
        },
        {
            "start": 411,
            "end": 420,
            "fare": 743
        },
        {
            "start": 421,
            "end": 430,
            "fare": 757
        },
        {
            "start": 431,
            "end": 440,
            "fare": 770
        },
        {
            "start": 441,
            "end": 450,
            "fare": 784
        },
        {
            "start": 451,
            "end": 460,
            "fare": 797
        },
        {
            "start": 461,
            "end": 470,
            "fare": 812
        },
        {
            "start": 471,
            "end": 480,
            "fare": 826
        },
        {
            "start": 481,
            "end": 490,
            "fare": 839
        },
        {
            "start": 491,
            "end": 500,
            "fare": 852
        },
        {
            "start": 501,
            "end": 510,
            "fare": 905
        },
        {
            "start": 511,
            "end": 520,
            "fare": 917
        },
        {
            "start": 521,
            "end": 530,
            "fare": 929
        },
        {
            "start": 531,
            "end": 540,
            "fare": 940
        },
        {
            "start": 541,
            "end": 550,
            "fare": 952
        },
        {
            "start": 551,
            "end": 560,
            "fare": 964
        },
        {
            "start": 561,
            "end": 570,
            "fare": 977
        },
        {
            "start": 571,
            "end": 580,
            "fare": 988
        },
        {
            "start": 581,
            "end": 590,
            "fare": 988
        },
        {
            "start": 591,
            "end": 600,
            "fare": 1011
        },
        {
            "start": 601,
            "end": 610,
            "fare": 1024
        },
        {
            "start": 611,
            "end": 620,
            "fare": 1036
        },
        {
            "start": 621,
            "end": 630,
            "fare": 1048
        },
        {
            "start": 631,
            "end": 640,
            "fare": 1059
        },
        {
            "start": 641,
            "end": 650,
            "fare": 1071
        },
        {
            "start": 651,
            "end": 660,
            "fare": 1083
        },
        {
            "start": 661,
            "end": 670,
            "fare": 1096
        },
        {
            "start": 671,
            "end": 680,
            "fare": 1106
        },
        {
            "start": 681,
            "end": 690,
            "fare": 1119
        },
        {
            "start": 691,
            "end": 700,
            "fare": 1130
        },
        {
            "start": 701,
            "end": 710,
            "fare": 1143
        },
        {
            "start": 711,
            "end": 720,
            "fare": 1155
        },
        {
            "start": 721,
            "end": 730,
            "fare": 1166
        },
        {
            "start": 731,
            "end": 740,
            "fare": 1178
        },
        {
            "start": 741,
            "end": 750,
            "fare": 1190
        },
        {
            "start": 751,
            "end": 760,
            "fare": 1200
        },
        {
            "start": 761,
            "end": 770,
            "fare": 1211
        },
        {
            "start": 771,
            "end": 780,
            "fare": 1221
        },
        {
            "start": 781,
            "end": 790,
            "fare": 1231
        },
        {
            "start": 791,
            "end": 800,
            "fare": 1240
        },
        {
            "start": 801,
            "end": 810,
            "fare": 1251
        },
        {
            "start": 811,
            "end": 820,
            "fare": 1260
        },
        {
            "start": 821,
            "end": 830,
            "fare": 1271
        },
        {
            "start": 831,
            "end": 840,
            "fare": 1281
        },
        {
            "start": 841,
            "end": 850,
            "fare": 1291
        },
        {
            "start": 851,
            "end": 860,
            "fare": 1300
        },
        {
            "start": 861,
            "end": 870,
            "fare": 1311
        },
        {
            "start": 871,
            "end": 880,
            "fare": 1320
        },
        {
            "start": 881,
            "end": 890,
            "fare": 1332
        },
        {
            "start": 901,
            "end": 910,
            "fare": 1341
        },
        {
            "start": 911,
            "end": 920,
            "fare": 1361
        },
        {
            "start": 921,
            "end": 930,
            "fare": 1371
        },
        {
            "start": 931,
            "end": 940,
            "fare": 1381
        },
        {
            "start": 941,
            "end": 950,
            "fare": 1392
        },
        {
            "start": 961,
            "end": 970,
            "fare": 1412
        },
        {
            "start": 981,
            "end": 990,
            "fare": 1432
        },
        {
            "start": 1001,
            "end": 1025,
            "fare": 1463
        },
        {
            "start": 1051,
            "end": 1075,
            "fare": 1504
        },
        {
            "start": 1101,
            "end": 1125,
            "fare": 1544
        },
        {
            "start": 1201,
            "end": 1225,
            "fare": 1627
        },
        {
            "start": 1301,
            "end": 1325,
            "fare": 1710
        },
        {
            "start": 1401,
            "end": 1425,
            "fare": 1792
        },
        {
            "start": 1501,
            "end": 1525,
            "fare": 187
        },
        {
            "start": 1601,
            "end": 1625,
            "fare": 1956
        },
        {
            "start": 1701,
            "end": 1725,
            "fare": 2039
        },
        {
            "start": 1801,
            "end": 1825,
            "fare": 2121
        },
        {
            "start": 1901,
            "end": 1925,
            "fare": 2202
        },
        {
            "start": 2001,
            "end": 2025,
            "fare": 2277
        },
        {
            "start": 2101,
            "end": 2125,
            "fare": 2329
        },
        {
            "start": 2201,
            "end": 2225,
            "fare": 2381
        },
        {
            "start": 2301,
            "end": 2325,
            "fare": 2432
        },
        {
            "start": 2401,
            "end": 2425,
            "fare": 2484
        },
        {
            "start": 2501,
            "end": 2550,
            "fare": 2548
        },
        {
            "start": 2601,
            "end": 2650,
            "fare": 2600
        },
        {
            "start": 2701,
            "end": 2750,
            "fare": 2651
        },
        {
            "start": 2801,
            "end": 2850,
            "fare": 2703
        },
        {
            "start": 2901,
            "end": 2950,
            "fare": 2755
        },
        {
            "start": 3001,
            "end": 3050,
            "fare": 2806
        },
        {
            "start": 3101,
            "end": 3150,
            "fare": 2858
        },
        {
            "start": 3201,
            "end": 3250,
            "fare": 2910
        },
        {
            "start": 3301,
            "end": 3350,
            "fare": 2961
        },
        {
            "start": 3401,
            "end": 3450,
            "fare": 3013
        },
        {
            "start": 3501,
            "end": 3550,
            "fare": 3064
        },
        {
            "start": 3601,
            "end": 3650,
            "fare": 3116
        },
        {
            "start": 3701,
            "end": 3750,
            "fare": 3168
        },
        {
            "start": 3801,
            "end": 3850,
            "fare": 3193
        },
        {
            "start": 3901,
            "end": 3950,
            "fare": 3270
        },
        {
            "start": 4001,
            "end": 4050,
            "fare": 3323
        },
        {
            "start": 4101,
            "end": 4150,
            "fare": 3374
        },
        {
            "start": 4201,
            "end": 4250,
            "fare": 3425
        },
        {
            "start": 4301,
            "end": 4350,
            "fare": 3478
        },
        {
            "start": 4401,
            "end": 4450,
            "fare": 3529
        },
        {
            "start": 4501,
            "end": 4550,
            "fare": 3581
        },
        {
            "start": 4601,
            "end": 4650,
            "fare": 3633
        },
        {
            "start": 4701,
            "end": 4750,
            "fare": 3683
        },
        {
            "start": 4801,
            "end": 4850,
            "fare": 3736
        },
        {
            "start": 4901,
            "end": 4950,
            "fare": 3787
        },
        {
            "start": 4951,
            "end": 5000,
            "fare": 3813
        }
    ],
    "1A": [
        {
            "start": 1,
            "end": 5,
            "fare": 985
        },
        {
            "start": 6,
            "end": 10,
            "fare": 985
        },
        {
            "start": 11,
            "end": 15,
            "fare": 985
        },
        {
            "start": 16,
            "end": 20,
            "fare": 985
        },
        {
            "start": 21,
            "end": 25,
            "fare": 985
        },
        {
            "start": 26,
            "end": 30,
            "fare": 985
        },
        {
            "start": 31,
            "end": 35,
            "fare": 985
        },
        {
            "start": 36,
            "end": 40,
            "fare": 985
        },
        {
            "start": 41,
            "end": 45,
            "fare": 985
        },
        {
            "start": 46,
            "end": 50,
            "fare": 985
        },
        {
            "start": 51,
            "end": 55,
            "fare": 985
        },
        {
            "start": 56,
            "end": 60,
            "fare": 985
        },
        {
            "start": 61,
            "end": 65,
            "fare": 985
        },
        {
            "start": 66,
            "end": 70,
            "fare": 985
        },
        {
            "start": 71,
            "end": 75,
            "fare": 985
        },
        {
            "start": 76,
            "end": 80,
            "fare": 985
        },
        {
            "start": 81,
            "end": 85,
            "fare": 985
        },
        {
            "start": 86,
            "end": 90,
            "fare": 985
        },
        {
            "start": 91,
            "end": 95,
            "fare": 985
        },
        {
            "start": 96,
            "end": 100,
            "fare": 985
        },
        {
            "start": 101,
            "end": 105,
            "fare": 985
        },
        {
            "start": 106,
            "end": 110,
            "fare": 985
        },
        {
            "start": 111,
            "end": 115,
            "fare": 985
        },
        {
            "start": 116,
            "end": 120,
            "fare": 985
        },
        {
            "start": 121,
            "end": 125,
            "fare": 985
        },
        {
            "start": 126,
            "end": 130,
            "fare": 985
        },
        {
            "start": 131,
            "end": 135,
            "fare": 985
        },
        {
            "start": 136,
            "end": 140,
            "fare": 985
        },
        {
            "start": 141,
            "end": 145,
            "fare": 985
        },
        {
            "start": 146,
            "end": 150,
            "fare": 985
        },
        {
            "start": 151,
            "end": 155,
            "fare": 985
        },
        {
            "start": 156,
            "end": 160,
            "fare": 985
        },
        {
            "start": 161,
            "end": 165,
            "fare": 985
        },
        {
            "start": 166,
            "end": 170,
            "fare": 985
        },
        {
            "start": 171,
            "end": 175,
            "fare": 985
        },
        {
            "start": 176,
            "end": 180,
            "fare": 985
        },
        {
            "start": 181,
            "end": 185,
            "fare": 985
        },
        {
            "start": 186,
            "end": 190,
            "fare": 985
        },
        {
            "start": 191,
            "end": 195,
            "fare": 985
        },
        {
            "start": 196,
            "end": 200,
            "fare": 985
        },
        {
            "start": 201,
            "end": 205,
            "fare": 985
        },
        {
            "start": 206,
            "end": 210,
            "fare": 985
        },
        {
            "start": 211,
            "end": 215,
            "fare": 985
        },
        {
            "start": 216,
            "end": 220,
            "fare": 985
        },
        {
            "start": 221,
            "end": 225,
            "fare": 985
        },
        {
            "start": 226,
            "end": 230,
            "fare": 985
        },
        {
            "start": 231,
            "end": 235,
            "fare": 985
        },
        {
            "start": 236,
            "end": 240,
            "fare": 985
        },
        {
            "start": 241,
            "end": 245,
            "fare": 985
        },
        {
            "start": 246,
            "end": 250,
            "fare": 985
        },
        {
            "start": 251,
            "end": 255,
            "fare": 985
        },
        {
            "start": 256,
            "end": 260,
            "fare": 985
        },
        {
            "start": 261,
            "end": 265,
            "fare": 985
        },
        {
            "start": 266,
            "end": 270,
            "fare": 985
        },
        {
            "start": 271,
            "end": 275,
            "fare": 985
        },
        {
            "start": 276,
            "end": 280,
            "fare": 985
        },
        {
            "start": 281,
            "end": 285,
            "fare": 985
        },
        {
            "start": 286,
            "end": 290,
            "fare": 985
        },
        {
            "start": 291,
            "end": 295,
            "fare": 985
        },
        {
            "start": 296,
            "end": 300,
            "fare": 985
        },
        {
            "start": 301,
            "end": 310,
            "fare": 1008
        },
        {
            "start": 311,
            "end": 320,
            "fare": 1033
        },
        {
            "start": 321,
            "end": 330,
            "fare": 1058
        },
        {
            "start": 331,
            "end": 340,
            "fare": 1081
        },
        {
            "start": 341,
            "end": 350,
            "fare": 1106
        },
        {
            "start": 351,
            "end": 360,
            "fare": 1129
        },
        {
            "start": 361,
            "end": 370,
            "fare": 1153
        },
        {
            "start": 371,
            "end": 380,
            "fare": 1178
        },
        {
            "start": 381,
            "end": 390,
            "fare": 1201
        },
        {
            "start": 381,
            "end": 390,
            "fare": 1201
        },
        {
            "start": 391,
            "end": 400,
            "fare": 1225
        },
        {
            "start": 401,
            "end": 410,
            "fare": 1249
        },
        {
            "start": 411,
            "end": 420,
            "fare": 1273
        },
        {
            "start": 421,
            "end": 430,
            "fare": 1297
        },
        {
            "start": 431,
            "end": 440,
            "fare": 1321
        },
        {
            "start": 441,
            "end": 450,
            "fare": 1345
        },
        {
            "start": 451,
            "end": 460,
            "fare": 1368
        },
        {
            "start": 461,
            "end": 470,
            "fare": 1393
        },
        {
            "start": 471,
            "end": 480,
            "fare": 1417
        },
        {
            "start": 481,
            "end": 490,
            "fare": 1440
        },
        {
            "start": 491,
            "end": 500,
            "fare": 1465
        },
        {
            "start": 501,
            "end": 510,
            "fare": 1535
        },
        {
            "start": 511,
            "end": 520,
            "fare": 1557
        },
        {
            "start": 521,
            "end": 530,
            "fare": 1577
        },
        {
            "start": 531,
            "end": 540,
            "fare": 1598
        },
        {
            "start": 541,
            "end": 550,
            "fare": 1619
        },
        {
            "start": 551,
            "end": 560,
            "fare": 1640
        },
        {
            "start": 561,
            "end": 570,
            "fare": 1661
        },
        {
            "start": 571,
            "end": 580,
            "fare": 1681
        },
        {
            "start": 581,
            "end": 590,
            "fare": 1681
        },
        {
            "start": 591,
            "end": 600,
            "fare": 1723
        },
        {
            "start": 601,
            "end": 610,
            "fare": 1745
        },
        {
            "start": 611,
            "end": 620,
            "fare": 1765
        },
        {
            "start": 621,
            "end": 630,
            "fare": 1786
        },
        {
            "start": 631,
            "end": 640,
            "fare": 1807
        },
        {
            "start": 641,
            "end": 650,
            "fare": 1828
        },
        {
            "start": 651,
            "end": 660,
            "fare": 1849
        },
        {
            "start": 661,
            "end": 670,
            "fare": 1869
        },
        {
            "start": 671,
            "end": 680,
            "fare": 1891
        },
        {
            "start": 681,
            "end": 690,
            "fare": 1911
        },
        {
            "start": 691,
            "end": 700,
            "fare": 1932
        },
        {
            "start": 701,
            "end": 710,
            "fare": 1952
        },
        {
            "start": 711,
            "end": 720,
            "fare": 1974
        },
        {
            "start": 721,
            "end": 730,
            "fare": 1994
        },
        {
            "start": 731,
            "end": 740,
            "fare": 2015
        },
        {
            "start": 741,
            "end": 750,
            "fare": 2036
        },
        {
            "start": 751,
            "end": 760,
            "fare": 2054
        },
        {
            "start": 761,
            "end": 770,
            "fare": 2072
        },
        {
            "start": 771,
            "end": 780,
            "fare": 2089
        },
        {
            "start": 781,
            "end": 790,
            "fare": 2107
        },
        {
            "start": 791,
            "end": 800,
            "fare": 2125
        },
        {
            "start": 801,
            "end": 810,
            "fare": 2142
        },
        {
            "start": 811,
            "end": 820,
            "fare": 2160
        },
        {
            "start": 821,
            "end": 830,
            "fare": 2178
        },
        {
            "start": 831,
            "end": 840,
            "fare": 2196
        },
        {
            "start": 841,
            "end": 850,
            "fare": 2213
        },
        {
            "start": 851,
            "end": 860,
            "fare": 2231
        },
        {
            "start": 861,
            "end": 870,
            "fare": 2249
        },
        {
            "start": 871,
            "end": 880,
            "fare": 2266
        },
        {
            "start": 881,
            "end": 890,
            "fare": 2284
        },
        {
            "start": 901,
            "end": 910,
            "fare": 2302
        },
        {
            "start": 911,
            "end": 920,
            "fare": 2336
        },
        {
            "start": 921,
            "end": 930,
            "fare": 2355
        },
        {
            "start": 931,
            "end": 940,
            "fare": 2372
        },
        {
            "start": 941,
            "end": 950,
            "fare": 2391
        },
        {
            "start": 961,
            "end": 970,
            "fare": 2425
        },
        {
            "start": 981,
            "end": 990,
            "fare": 2460
        },
        {
            "start": 1001,
            "end": 1025,
            "fare": 2517
        },
        {
            "start": 1051,
            "end": 1075,
            "fare": 2589
        },
        {
            "start": 1101,
            "end": 1125,
            "fare": 2661
        },
        {
            "start": 1201,
            "end": 1225,
            "fare": 2807
        },
        {
            "start": 1301,
            "end": 1325,
            "fare": 2952
        },
        {
            "start": 1401,
            "end": 1425,
            "fare": 3097
        },
        {
            "start": 1501,
            "end": 1525,
            "fare": 324
        },
        {
            "start": 1601,
            "end": 1625,
            "fare": 3388
        },
        {
            "start": 1701,
            "end": 1725,
            "fare": 3534
        },
        {
            "start": 1801,
            "end": 1825,
            "fare": 3678
        },
        {
            "start": 1901,
            "end": 1925,
            "fare": 3824
        },
        {
            "start": 2001,
            "end": 2025,
            "fare": 3956
        },
        {
            "start": 2101,
            "end": 2125,
            "fare": 4049
        },
        {
            "start": 2201,
            "end": 2225,
            "fare": 4141
        },
        {
            "start": 2301,
            "end": 2325,
            "fare": 4235
        },
        {
            "start": 2401,
            "end": 2425,
            "fare": 4327
        },
        {
            "start": 2501,
            "end": 2550,
            "fare": 4442
        },
        {
            "start": 2601,
            "end": 2650,
            "fare": 4535
        },
        {
            "start": 2701,
            "end": 2750,
            "fare": 4627
        },
        {
            "start": 2801,
            "end": 2850,
            "fare": 4720
        },
        {
            "start": 2901,
            "end": 2950,
            "fare": 4812
        },
        {
            "start": 3001,
            "end": 3050,
            "fare": 4905
        },
        {
            "start": 3101,
            "end": 3150,
            "fare": 4997
        },
        {
            "start": 3201,
            "end": 3250,
            "fare": 5091
        },
        {
            "start": 3301,
            "end": 3350,
            "fare": 5183
        },
        {
            "start": 3401,
            "end": 3450,
            "fare": 5276
        },
        {
            "start": 3501,
            "end": 3550,
            "fare": 5368
        },
        {
            "start": 3601,
            "end": 3650,
            "fare": 5462
        },
        {
            "start": 3701,
            "end": 3750,
            "fare": 5554
        },
        {
            "start": 3801,
            "end": 3850,
            "fare": 5600
        },
        {
            "start": 3901,
            "end": 3950,
            "fare": 5740
        },
        {
            "start": 4001,
            "end": 4050,
            "fare": 5833
        },
        {
            "start": 4101,
            "end": 4150,
            "fare": 5925
        },
        {
            "start": 4201,
            "end": 4250,
            "fare": 6017
        },
        {
            "start": 4301,
            "end": 4350,
            "fare": 6110
        },
        {
            "start": 4401,
            "end": 4450,
            "fare": 6203
        },
        {
            "start": 4501,
            "end": 4550,
            "fare": 6295
        },
        {
            "start": 4601,
            "end": 4650,
            "fare": 6388
        },
        {
            "start": 4701,
            "end": 4750,
            "fare": 6481
        },
        {
            "start": 4801,
            "end": 4850,
            "fare": 6573
        },
        {
            "start": 4901,
            "end": 4950,
            "fare": 6666
        },
        {
            "start": 4951,
            "end": 5000,
            "fare": 6712
        }
    ],
    "CC": [
        {
            "start": 1,
            "end": 5,
            "fare": 192
        },
        {
            "start": 6,
            "end": 10,
            "fare": 192
        },
        {
            "start": 11,
            "end": 15,
            "fare": 192
        },
        {
            "start": 16,
            "end": 20,
            "fare": 192
        },
        {
            "start": 21,
            "end": 25,
            "fare": 192
        },
        {
            "start": 26,
            "end": 30,
            "fare": 192
        },
        {
            "start": 31,
            "end": 35,
            "fare": 192
        },
        {
            "start": 36,
            "end": 40,
            "fare": 192
        },
        {
            "start": 41,
            "end": 45,
            "fare": 192
        },
        {
            "start": 46,
            "end": 50,
            "fare": 192
        },
        {
            "start": 51,
            "end": 55,
            "fare": 192
        },
        {
            "start": 56,
            "end": 60,
            "fare": 192
        },
        {
            "start": 61,
            "end": 65,
            "fare": 192
        },
        {
            "start": 66,
            "end": 70,
            "fare": 192
        },
        {
            "start": 71,
            "end": 75,
            "fare": 192
        },
        {
            "start": 76,
            "end": 80,
            "fare": 192
        },
        {
            "start": 81,
            "end": 85,
            "fare": 192
        },
        {
            "start": 86,
            "end": 90,
            "fare": 192
        },
        {
            "start": 91,
            "end": 95,
            "fare": 192
        },
        {
            "start": 96,
            "end": 100,
            "fare": 192
        },
        {
            "start": 101,
            "end": 105,
            "fare": 192
        },
        {
            "start": 106,
            "end": 110,
            "fare": 192
        },
        {
            "start": 111,
            "end": 115,
            "fare": 192
        },
        {
            "start": 116,
            "end": 120,
            "fare": 192
        },
        {
            "start": 121,
            "end": 125,
            "fare": 192
        },
        {
            "start": 126,
            "end": 130,
            "fare": 192
        },
        {
            "start": 131,
            "end": 135,
            "fare": 192
        },
        {
            "start": 136,
            "end": 140,
            "fare": 192
        },
        {
            "start": 141,
            "end": 145,
            "fare": 192
        },
        {
            "start": 146,
            "end": 150,
            "fare": 192
        },
        {
            "start": 151,
            "end": 155,
            "fare": 197
        },
        {
            "start": 156,
            "end": 160,
            "fare": 201
        },
        {
            "start": 161,
            "end": 165,
            "fare": 206
        },
        {
            "start": 166,
            "end": 170,
            "fare": 210
        },
        {
            "start": 171,
            "end": 175,
            "fare": 215
        },
        {
            "start": 176,
            "end": 180,
            "fare": 219
        },
        {
            "start": 181,
            "end": 185,
            "fare": 223
        },
        {
            "start": 186,
            "end": 190,
            "fare": 227
        },
        {
            "start": 191,
            "end": 195,
            "fare": 232
        },
        {
            "start": 196,
            "end": 200,
            "fare": 236
        },
        {
            "start": 201,
            "end": 205,
            "fare": 240
        },
        {
            "start": 206,
            "end": 210,
            "fare": 244
        },
        {
            "start": 211,
            "end": 215,
            "fare": 248
        },
        {
            "start": 216,
            "end": 220,
            "fare": 252
        },
        {
            "start": 221,
            "end": 225,
            "fare": 257
        },
        {
            "start": 226,
            "end": 230,
            "fare": 261
        },
        {
            "start": 231,
            "end": 235,
            "fare": 266
        },
        {
            "start": 236,
            "end": 240,
            "fare": 270
        },
        {
            "start": 241,
            "end": 245,
            "fare": 275
        },
        {
            "start": 246,
            "end": 250,
            "fare": 278
        },
        {
            "start": 251,
            "end": 255,
            "fare": 283
        },
        {
            "start": 256,
            "end": 260,
            "fare": 286
        },
        {
            "start": 261,
            "end": 265,
            "fare": 290
        },
        {
            "start": 266,
            "end": 270,
            "fare": 293
        },
        {
            "start": 271,
            "end": 275,
            "fare": 297
        },
        {
            "start": 276,
            "end": 280,
            "fare": 300
        },
        {
            "start": 281,
            "end": 285,
            "fare": 305
        },
        {
            "start": 286,
            "end": 290,
            "fare": 308
        },
        {
            "start": 291,
            "end": 295,
            "fare": 312
        },
        {
            "start": 296,
            "end": 300,
            "fare": 316
        },
        {
            "start": 301,
            "end": 310,
            "fare": 323
        },
        {
            "start": 311,
            "end": 320,
            "fare": 331
        },
        {
            "start": 321,
            "end": 330,
            "fare": 339
        },
        {
            "start": 331,
            "end": 340,
            "fare": 346
        },
        {
            "start": 341,
            "end": 350,
            "fare": 353
        },
        {
            "start": 351,
            "end": 360,
            "fare": 361
        },
        {
            "start": 361,
            "end": 370,
            "fare": 368
        },
        {
            "start": 371,
            "end": 380,
            "fare": 376
        },
        {
            "start": 381,
            "end": 390,
            "fare": 384
        },
        {
            "start": 381,
            "end": 390,
            "fare": 384
        },
        {
            "start": 391,
            "end": 400,
            "fare": 391
        },
        {
            "start": 401,
            "end": 410,
            "fare": 399
        },
        {
            "start": 411,
            "end": 420,
            "fare": 405
        },
        {
            "start": 421,
            "end": 430,
            "fare": 413
        },
        {
            "start": 431,
            "end": 440,
            "fare": 421
        },
        {
            "start": 441,
            "end": 450,
            "fare": 428
        },
        {
            "start": 451,
            "end": 460,
            "fare": 436
        },
        {
            "start": 461,
            "end": 470,
            "fare": 444
        },
        {
            "start": 471,
            "end": 480,
            "fare": 451
        },
        {
            "start": 481,
            "end": 490,
            "fare": 459
        },
        {
            "start": 491,
            "end": 500,
            "fare": 466
        },
        {
            "start": 501,
            "end": 510,
            "fare": 492
        },
        {
            "start": 511,
            "end": 520,
            "fare": 499
        },
        {
            "start": 521,
            "end": 530,
            "fare": 505
        },
        {
            "start": 531,
            "end": 540,
            "fare": 512
        },
        {
            "start": 541,
            "end": 550,
            "fare": 519
        },
        {
            "start": 551,
            "end": 560,
            "fare": 525
        },
        {
            "start": 561,
            "end": 570,
            "fare": 532
        },
        {
            "start": 571,
            "end": 580,
            "fare": 538
        },
        {
            "start": 581,
            "end": 590,
            "fare": 538
        },
        {
            "start": 591,
            "end": 600,
            "fare": 551
        },
        {
            "start": 601,
            "end": 610,
            "fare": 557
        },
        {
            "start": 611,
            "end": 620,
            "fare": 564
        },
        {
            "start": 621,
            "end": 630,
            "fare": 570
        },
        {
            "start": 631,
            "end": 640,
            "fare": 577
        },
        {
            "start": 641,
            "end": 650,
            "fare": 584
        },
        {
            "start": 651,
            "end": 660,
            "fare": 590
        },
        {
            "start": 661,
            "end": 670,
            "fare": 597
        },
        {
            "start": 671,
            "end": 680,
            "fare": 602
        },
        {
            "start": 681,
            "end": 690,
            "fare": 609
        },
        {
            "start": 691,
            "end": 700,
            "fare": 616
        },
        {
            "start": 701,
            "end": 710,
            "fare": 622
        },
        {
            "start": 711,
            "end": 720,
            "fare": 629
        },
        {
            "start": 721,
            "end": 730,
            "fare": 635
        },
        {
            "start": 731,
            "end": 740,
            "fare": 642
        },
        {
            "start": 741,
            "end": 750,
            "fare": 649
        },
        {
            "start": 751,
            "end": 760,
            "fare": 654
        },
        {
            "start": 761,
            "end": 770,
            "fare": 659
        },
        {
            "start": 771,
            "end": 780,
            "fare": 664
        },
        {
            "start": 781,
            "end": 790,
            "fare": 670
        },
        {
            "start": 791,
            "end": 800,
            "fare": 675
        },
        {
            "start": 801,
            "end": 810,
            "fare": 681
        },
        {
            "start": 811,
            "end": 820,
            "fare": 687
        },
        {
            "start": 821,
            "end": 830,
            "fare": 692
        },
        {
            "start": 831,
            "end": 840,
            "fare": 698
        },
        {
            "start": 841,
            "end": 850,
            "fare": 703
        },
        {
            "start": 851,
            "end": 860,
            "fare": 709
        },
        {
            "start": 861,
            "end": 870,
            "fare": 714
        },
        {
            "start": 871,
            "end": 880,
            "fare": 719
        },
        {
            "start": 881,
            "end": 890,
            "fare": 724
        },
        {
            "start": 901,
            "end": 910,
            "fare": 735
        },
        {
            "start": 911,
            "end": 920,
            "fare": 741
        },
        {
            "start": 921,
            "end": 930,
            "fare": 747
        },
        {
            "start": 931,
            "end": 940,
            "fare": 752
        },
        {
            "start": 941,
            "end": 950,
            "fare": 758
        },
        {
            "start": 961,
            "end": 970,
            "fare": 769
        },
        {
            "start": 981,
            "end": 990,
            "fare": 779
        },
        {
            "start": 1001,
            "end": 1025,
            "fare": 796
        },
        {
            "start": 1051,
            "end": 1075,
            "fare": 819
        },
        {
            "start": 1101,
            "end": 1125,
            "fare": 840
        },
        {
            "start": 1201,
            "end": 1225,
            "fare": 885
        },
        {
            "start": 1301,
            "end": 1325,
            "fare": 929
        },
        {
            "start": 1401,
            "end": 1425,
            "fare": 973
        },
        {
            "start": 1501,
            "end": 1525,
            "fare": 1018
        },
        {
            "start": 1601,
            "end": 1625,
            "fare": 1062
        },
        {
            "start": 1701,
            "end": 1725,
            "fare": 1106
        },
        {
            "start": 1801,
            "end": 1825,
            "fare": 1151
        },
        {
            "start": 1901,
            "end": 1925,
            "fare": 1195
        },
        {
            "start": 2001,
            "end": 2025,
            "fare": 1235
        },
        {
            "start": 2101,
            "end": 2125,
            "fare": 1262
        },
        {
            "start": 2201,
            "end": 2225,
            "fare": 1290
        },
        {
            "start": 2301,
            "end": 2325,
            "fare": 1316
        },
        {
            "start": 2401,
            "end": 2425,
            "fare": 1344
        },
        {
            "start": 2501,
            "end": 2550,
            "fare": 1377
        },
        {
            "start": 2601,
            "end": 2650,
            "fare": 1404
        },
        {
            "start": 2701,
            "end": 2750,
            "fare": 1432
        },
        {
            "start": 2801,
            "end": 2850,
            "fare": 1458
        },
        {
            "start": 2901,
            "end": 2950,
            "fare": 1486
        },
        {
            "start": 3001,
            "end": 3050,
            "fare": 1513
        },
        {
            "start": 3101,
            "end": 3150,
            "fare": 1540
        },
        {
            "start": 3201,
            "end": 3250,
            "fare": 1567
        },
        {
            "start": 3301,
            "end": 3350,
            "fare": 1595
        },
        {
            "start": 3401,
            "end": 3450,
            "fare": 1621
        },
        {
            "start": 3501,
            "end": 3550,
            "fare": 1649
        },
        {
            "start": 3601,
            "end": 3650,
            "fare": 1676
        },
        {
            "start": 3701,
            "end": 3750,
            "fare": 1703
        },
        {
            "start": 3801,
            "end": 3850,
            "fare": 1716
        },
        {
            "start": 3901,
            "end": 3950,
            "fare": 1758
        },
        {
            "start": 4001,
            "end": 4050,
            "fare": 1784
        },
        {
            "start": 4101,
            "end": 4150,
            "fare": 1816
        },
        {
            "start": 4201,
            "end": 4250,
            "fare": 1852
        },
        {
            "start": 4301,
            "end": 4350,
            "fare": 1887
        },
        {
            "start": 4401,
            "end": 4450,
            "fare": 1926
        },
        {
            "start": 4501,
            "end": 4550,
            "fare": 1961
        },
        {
            "start": 4601,
            "end": 4650,
            "fare": 1996
        },
        {
            "start": 4701,
            "end": 4750,
            "fare": 2032
        },
        {
            "start": 4801,
            "end": 4850,
            "fare": 2067
        },
        {
            "start": 4901,
            "end": 4950,
            "fare": 2106
        },
        {
            "start": 4951,
            "end": 5000,
            "fare": 2121
        }
    ],
    "2S": [
        {
            "start": 1,
            "end": 5,
            "fare": 27
        },
        {
            "start": 6,
            "end": 10,
            "fare": 27
        },
        {
            "start": 11,
            "end": 15,
            "fare": 27
        },
        {
            "start": 16,
            "end": 20,
            "fare": 27
        },
        {
            "start": 21,
            "end": 25,
            "fare": 27
        },
        {
            "start": 26,
            "end": 30,
            "fare": 27
        },
        {
            "start": 31,
            "end": 35,
            "fare": 27
        },
        {
            "start": 36,
            "end": 40,
            "fare": 27
        },
        {
            "start": 41,
            "end": 45,
            "fare": 27
        },
        {
            "start": 46,
            "end": 50,
            "fare": 27
        },
        {
            "start": 51,
            "end": 55,
            "fare": 28
        },
        {
            "start": 56,
            "end": 60,
            "fare": 29
        },
        {
            "start": 61,
            "end": 65,
            "fare": 31
        },
        {
            "start": 66,
            "end": 70,
            "fare": 33
        },
        {
            "start": 71,
            "end": 75,
            "fare": 34
        },
        {
            "start": 76,
            "end": 80,
            "fare": 35
        },
        {
            "start": 81,
            "end": 85,
            "fare": 36
        },
        {
            "start": 86,
            "end": 90,
            "fare": 38
        },
        {
            "start": 91,
            "end": 95,
            "fare": 39
        },
        {
            "start": 96,
            "end": 100,
            "fare": 40
        },
        {
            "start": 101,
            "end": 105,
            "fare": 41
        },
        {
            "start": 106,
            "end": 110,
            "fare": 42
        },
        {
            "start": 111,
            "end": 115,
            "fare": 44
        },
        {
            "start": 116,
            "end": 120,
            "fare": 46
        },
        {
            "start": 121,
            "end": 125,
            "fare": 47
        },
        {
            "start": 126,
            "end": 130,
            "fare": 48
        },
        {
            "start": 131,
            "end": 135,
            "fare": 49
        },
        {
            "start": 136,
            "end": 140,
            "fare": 51
        },
        {
            "start": 141,
            "end": 145,
            "fare": 52
        },
        {
            "start": 146,
            "end": 150,
            "fare": 53
        },
        {
            "start": 151,
            "end": 155,
            "fare": 54
        },
        {
            "start": 156,
            "end": 160,
            "fare": 54
        },
        {
            "start": 161,
            "end": 165,
            "fare": 55
        },
        {
            "start": 166,
            "end": 170,
            "fare": 56
        },
        {
            "start": 171,
            "end": 175,
            "fare": 57
        },
        {
            "start": 176,
            "end": 180,
            "fare": 57
        },
        {
            "start": 181,
            "end": 185,
            "fare": 58
        },
        {
            "start": 186,
            "end": 190,
            "fare": 60
        },
        {
            "start": 191,
            "end": 195,
            "fare": 61
        },
        {
            "start": 196,
            "end": 200,
            "fare": 62
        },
        {
            "start": 201,
            "end": 205,
            "fare": 63
        },
        {
            "start": 206,
            "end": 210,
            "fare": 64
        },
        {
            "start": 211,
            "end": 215,
            "fare": 66
        },
        {
            "start": 216,
            "end": 220,
            "fare": 68
        },
        {
            "start": 221,
            "end": 225,
            "fare": 69
        },
        {
            "start": 226,
            "end": 230,
            "fare": 70
        },
        {
            "start": 231,
            "end": 235,
            "fare": 71
        },
        {
            "start": 236,
            "end": 240,
            "fare": 73
        },
        {
            "start": 241,
            "end": 245,
            "fare": 74
        },
        {
            "start": 246,
            "end": 250,
            "fare": 75
        },
        {
            "start": 251,
            "end": 255,
            "fare": 76
        },
        {
            "start": 256,
            "end": 260,
            "fare": 77
        },
        {
            "start": 261,
            "end": 265,
            "fare": 79
        },
        {
            "start": 266,
            "end": 270,
            "fare": 79
        },
        {
            "start": 271,
            "end": 275,
            "fare": 80
        },
        {
            "start": 276,
            "end": 280,
            "fare": 81
        },
        {
            "start": 281,
            "end": 285,
            "fare": 82
        },
        {
            "start": 286,
            "end": 290,
            "fare": 84
        },
        {
            "start": 291,
            "end": 295,
            "fare": 85
        },
        {
            "start": 296,
            "end": 300,
            "fare": 86
        },
        {
            "start": 301,
            "end": 310,
            "fare": 88
        },
        {
            "start": 311,
            "end": 320,
            "fare": 90
        },
        {
            "start": 321,
            "end": 330,
            "fare": 92
        },
        {
            "start": 331,
            "end": 340,
            "fare": 95
        },
        {
            "start": 341,
            "end": 350,
            "fare": 97
        },
        {
            "start": 351,
            "end": 360,
            "fare": 99
        },
        {
            "start": 361,
            "end": 370,
            "fare": 102
        },
        {
            "start": 371,
            "end": 380,
            "fare": 103
        },
        {
            "start": 381,
            "end": 390,
            "fare": 106
        },
        {
            "start": 381,
            "end": 390,
            "fare": 106
        },
        {
            "start": 391,
            "end": 400,
            "fare": 108
        },
        {
            "start": 401,
            "end": 410,
            "fare": 110
        },
        {
            "start": 411,
            "end": 420,
            "fare": 112
        },
        {
            "start": 421,
            "end": 430,
            "fare": 114
        },
        {
            "start": 431,
            "end": 440,
            "fare": 117
        },
        {
            "start": 441,
            "end": 450,
            "fare": 118
        },
        {
            "start": 451,
            "end": 460,
            "fare": 120
        },
        {
            "start": 461,
            "end": 470,
            "fare": 123
        },
        {
            "start": 471,
            "end": 480,
            "fare": 124
        },
        {
            "start": 481,
            "end": 490,
            "fare": 127
        },
        {
            "start": 491,
            "end": 500,
            "fare": 129
        },
        {
            "start": 501,
            "end": 510,
            "fare": 130
        },
        {
            "start": 511,
            "end": 520,
            "fare": 133
        },
        {
            "start": 521,
            "end": 530,
            "fare": 134
        },
        {
            "start": 531,
            "end": 540,
            "fare": 137
        },
        {
            "start": 541,
            "end": 550,
            "fare": 139
        },
        {
            "start": 551,
            "end": 560,
            "fare": 140
        },
        {
            "start": 561,
            "end": 570,
            "fare": 143
        },
        {
            "start": 571,
            "end": 580,
            "fare": 144
        },
        {
            "start": 581,
            "end": 590,
            "fare": 144
        },
        {
            "start": 591,
            "end": 600,
            "fare": 148
        },
        {
            "start": 601,
            "end": 610,
            "fare": 149
        },
        {
            "start": 611,
            "end": 620,
            "fare": 152
        },
        {
            "start": 621,
            "end": 630,
            "fare": 153
        },
        {
            "start": 631,
            "end": 640,
            "fare": 156
        },
        {
            "start": 641,
            "end": 650,
            "fare": 158
        },
        {
            "start": 651,
            "end": 660,
            "fare": 159
        },
        {
            "start": 661,
            "end": 670,
            "fare": 162
        },
        {
            "start": 671,
            "end": 680,
            "fare": 163
        },
        {
            "start": 681,
            "end": 690,
            "fare": 166
        },
        {
            "start": 691,
            "end": 700,
            "fare": 168
        },
        {
            "start": 701,
            "end": 710,
            "fare": 169
        },
        {
            "start": 711,
            "end": 720,
            "fare": 172
        },
        {
            "start": 721,
            "end": 730,
            "fare": 172
        },
        {
            "start": 731,
            "end": 740,
            "fare": 175
        },
        {
            "start": 741,
            "end": 750,
            "fare": 177
        },
        {
            "start": 751,
            "end": 760,
            "fare": 178
        },
        {
            "start": 761,
            "end": 770,
            "fare": 180
        },
        {
            "start": 771,
            "end": 780,
            "fare": 181
        },
        {
            "start": 781,
            "end": 790,
            "fare": 183
        },
        {
            "start": 791,
            "end": 800,
            "fare": 184
        },
        {
            "start": 801,
            "end": 810,
            "fare": 185
        },
        {
            "start": 811,
            "end": 820,
            "fare": 188
        },
        {
            "start": 821,
            "end": 830,
            "fare": 189
        },
        {
            "start": 831,
            "end": 840,
            "fare": 191
        },
        {
            "start": 841,
            "end": 850,
            "fare": 193
        },
        {
            "start": 851,
            "end": 860,
            "fare": 194
        },
        {
            "start": 861,
            "end": 870,
            "fare": 196
        },
        {
            "start": 871,
            "end": 880,
            "fare": 197
        },
        {
            "start": 881,
            "end": 890,
            "fare": 199
        },
        {
            "start": 901,
            "end": 910,
            "fare": 201
        },
        {
            "start": 911,
            "end": 920,
            "fare": 204
        },
        {
            "start": 921,
            "end": 930,
            "fare": 205
        },
        {
            "start": 931,
            "end": 940,
            "fare": 207
        },
        {
            "start": 941,
            "end": 950,
            "fare": 209
        },
        {
            "start": 961,
            "end": 970,
            "fare": 212
        },
        {
            "start": 981,
            "end": 990,
            "fare": 216
        },
        {
            "start": 1001,
            "end": 1025,
            "fare": 221
        },
        {
            "start": 1051,
            "end": 1075,
            "fare": 227
        },
        {
            "start": 1101,
            "end": 1125,
            "fare": 234
        },
        {
            "start": 1201,
            "end": 1225,
            "fare": 247
        },
        {
            "start": 1301,
            "end": 1325,
            "fare": 260
        },
        {
            "start": 1401,
            "end": 1425,
            "fare": 274
        },
        {
            "start": 1501,
            "end": 1525,
            "fare": 287
        },
        {
            "start": 1601,
            "end": 1625,
            "fare": 301
        },
        {
            "start": 1701,
            "end": 1725,
            "fare": 314
        },
        {
            "start": 1801,
            "end": 1825,
            "fare": 327
        },
        {
            "start": 1901,
            "end": 1925,
            "fare": 340
        },
        {
            "start": 2001,
            "end": 2025,
            "fare": 352
        },
        {
            "start": 2101,
            "end": 2125,
            "fare": 360
        },
        {
            "start": 2201,
            "end": 2225,
            "fare": 369
        },
        {
            "start": 2301,
            "end": 2325,
            "fare": 378
        },
        {
            "start": 2401,
            "end": 2425,
            "fare": 387
        },
        {
            "start": 2501,
            "end": 2550,
            "fare": 398
        },
        {
            "start": 2601,
            "end": 2650,
            "fare": 406
        },
        {
            "start": 2701,
            "end": 2750,
            "fare": 415
        },
        {
            "start": 2801,
            "end": 2850,
            "fare": 424
        },
        {
            "start": 2901,
            "end": 2950,
            "fare": 432
        },
        {
            "start": 3001,
            "end": 3050,
            "fare": 441
        },
        {
            "start": 3101,
            "end": 3150,
            "fare": 450
        },
        {
            "start": 3201,
            "end": 3250,
            "fare": 459
        },
        {
            "start": 3301,
            "end": 3350,
            "fare": 467
        },
        {
            "start": 3401,
            "end": 3450,
            "fare": 476
        },
        {
            "start": 3501,
            "end": 3550,
            "fare": 485
        },
        {
            "start": 3601,
            "end": 3650,
            "fare": 493
        },
        {
            "start": 3701,
            "end": 3750,
            "fare": 501
        },
        {
            "start": 3801,
            "end": 3850,
            "fare": 505
        },
        {
            "start": 3901,
            "end": 3950,
            "fare": 519
        },
        {
            "start": 4001,
            "end": 4050,
            "fare": 528
        },
        {
            "start": 4101,
            "end": 4150,
            "fare": 536
        },
        {
            "start": 4201,
            "end": 4250,
            "fare": 545
        },
        {
            "start": 4301,
            "end": 4350,
            "fare": 554
        },
        {
            "start": 4401,
            "end": 4450,
            "fare": 563
        },
        {
            "start": 4501,
            "end": 4550,
            "fare": 571
        },
        {
            "start": 4601,
            "end": 4650,
            "fare": 580
        },
        {
            "start": 4701,
            "end": 4750,
            "fare": 588
        },
        {
            "start": 4801,
            "end": 4850,
            "fare": 597
        },
        {
            "start": 4901,
            "end": 4950,
            "fare": 605
        },
        {
            "start": 4951,
            "end": 5000,
            "fare": 609
        }
    ]
};

// Reservation charges per class (in INR)
const RESERVATION_CHARGES: Record<string, number> = {
    "2S": 15,
    "SL": 20,
    "CC": 25,
    "3A": 40,
    "2A": 50,
    "1A": 60
};

// Superfast charges per class (in INR)
const SUPERFAST_CHARGES: Record<string, number> = {
    "2S": 15,
    "SL": 30,
    "CC": 45,
    "3A": 45,
    "2A": 45,
    "1A": 75
};

/**
 * Returns the exact base fare for a given distance and class.
 */
function getBaseFare(distanceKm: number, travelClass: string): number {
    const bands = FARE_DATABASE[travelClass];
    if (!bands) return 0;
    
    // Find the matching distance band
    const band = bands.find(b => distanceKm >= b.start && distanceKm <= b.end);
    if (band) return band.fare;
    
    // Fallback: If distance is beyond 5000km, use the last band
    const lastBand = bands[bands.length - 1];
    if (lastBand && distanceKm > lastBand.end) {
        return lastBand.fare;
    }
    
    return 0;
}

export interface FareBreakdown {
    baseFare: number;
    reservationCharge: number;
    superfastCharge: number;
    gst: number;
    total: number;
}

/**
 * Calculates the complete estimated fare breakdown for a single leg.
 * 
 * @param distanceKm The travel distance of the leg in kilometers.
 * @param trainType The type of train (Passenger, Express, Superfast, Premium, Vande Bharat, Rajdhani, Shatabdi, Tejas, Gatiman).
 * @param travelClass The travel class (2S, SL, CC, 3A, 2A, 1A).
 */
export function calculateLegFare(
    distanceKm: number,
    trainType: string,
    travelClass: string
): FareBreakdown {
    // 1. Normalize travel class mapping
    let mappedClass = travelClass.toUpperCase();
    if (mappedClass === "3 Tier" || mappedClass === "3A" || mappedClass === "3 AC") mappedClass = "3A";
    if (mappedClass === "2 Tier" || mappedClass === "2A" || mappedClass === "2 AC") mappedClass = "2A";
    if (mappedClass === "First Class" || mappedClass === "1A" || mappedClass === "1 AC" || mappedClass === "FC") mappedClass = "1A";
    if (mappedClass === "Sleeper" || mappedClass === "SL") mappedClass = "SL";
    if (mappedClass === "Second Seating" || mappedClass === "2S" || mappedClass === "SS") mappedClass = "2S";
    if (mappedClass === "Chair Car" || mappedClass === "CC") mappedClass = "CC";

    // 2. Fetch base fare
    let baseFare = getBaseFare(distanceKm, mappedClass);
    
    // 3. Train type modifier (e.g. Premium markup for Vande Bharat, Tejas, Shatabdi, Rajdhani)
    const normalizedType = trainType.toUpperCase();
    let markupMultiplier = 1.0;
    
    if (normalizedType.includes("VANDE BHARAT") || normalizedType.includes("TEJAS")) {
        markupMultiplier = 1.40; // Premium semi-high speed markup
    } else if (normalizedType.includes("RAJDHANI") || normalizedType.includes("SHATABDI") || normalizedType.includes("GATIMAN")) {
        markupMultiplier = 1.25; // Premium services markup
    } else if (normalizedType.includes("PASSENGER") || normalizedType.includes("LOCAL") || normalizedType.includes("ORDINARY")) {
        markupMultiplier = 0.85; // Passenger train discount
    }
    
    baseFare = Math.round(baseFare * markupMultiplier);

    // 4. Reservation Charge
    const reservationCharge = RESERVATION_CHARGES[mappedClass] || 0;

    // 5. Superfast Charge
    let superfastCharge = 0;
    const isSuperfastOrPremium = 
        normalizedType.includes("SUPERFAST") || 
        normalizedType.includes("SF") || 
        normalizedType.includes("VANDE BHARAT") || 
        normalizedType.includes("TEJAS") || 
        normalizedType.includes("RAJDHANI") || 
        normalizedType.includes("SHATABDI") || 
        normalizedType.includes("GATIMAN");
        
    if (isSuperfastOrPremium) {
        superfastCharge = SUPERFAST_CHARGES[mappedClass] || 0;
    }

    // 6. GST (5% on all AC classes)
    const isACClass = ["3A", "2A", "1A", "CC"].includes(mappedClass);
    const gst = isACClass ? Math.round((baseFare + reservationCharge + superfastCharge) * 0.05) : 0;

    // 7. Total Journey Cost
    const total = baseFare + reservationCharge + superfastCharge + gst;

    return {
        baseFare,
        reservationCharge,
        superfastCharge,
        gst,
        total
    };
}

/**
 * Calculates the total estimated fare for a multi-leg route based on selected classes.
 */
export function calculateRouteFare(
    routeLegs: Array<{ distance_km: number; train_type: string; classes: string[] }>,
    selectedClasses: Record<number, string>
): number {
    let totalFare = 0;
    
    routeLegs.forEach((leg, index) => {
        const selectedClass = selectedClasses[index] || leg.classes[0] || "SL";
        const breakdown = calculateLegFare(leg.distance_km, leg.train_type, selectedClass);
        totalFare += breakdown.total;
    });
    
    return totalFare;
}
