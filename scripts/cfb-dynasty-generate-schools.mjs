#!/usr/bin/env node
/**
 * Generates Phase 1 school/conference JSON for CFB Dynasty Simulator.
 * Source: GAME_DESIGN.md appendix + FBSchedules / Opta / Fear The FCS (2026 season).
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'work', 'cfb-dynasty-sim', 'data');

function slug(name) {
  return name
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/[()]/g, '')
    .replace(/&/g, 'and')
    .replace(/'/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

const FBS_MEMBERS = {
  acc: [
    'Boston College',
    'California',
    'Clemson',
    'Duke',
    'Florida State',
    'Georgia Tech',
    'Louisville',
    'Miami',
    'NC State',
    'North Carolina',
    'Pittsburgh',
    'SMU',
    'Stanford',
    'Syracuse',
    'Virginia',
    'Virginia Tech',
    'Wake Forest'
  ],
  american: [
    'Army',
    'Charlotte',
    'East Carolina',
    'Florida Atlantic',
    'Memphis',
    'Navy',
    'North Texas',
    'Rice',
    'Temple',
    'Tulane',
    'Tulsa',
    'UAB',
    'USF',
    'UTSA'
  ],
  'big-12': [
    'Arizona',
    'Arizona State',
    'Baylor',
    'BYU',
    'Cincinnati',
    'Colorado',
    'Houston',
    'Iowa State',
    'Kansas',
    'Kansas State',
    'Oklahoma State',
    'TCU',
    'Texas Tech',
    'UCF',
    'Utah',
    'West Virginia'
  ],
  'big-ten': [
    'Illinois',
    'Indiana',
    'Iowa',
    'Maryland',
    'Michigan',
    'Michigan State',
    'Minnesota',
    'Nebraska',
    'Northwestern',
    'Ohio State',
    'Oregon',
    'Penn State',
    'Purdue',
    'Rutgers',
    'UCLA',
    'USC',
    'Washington',
    'Wisconsin'
  ],
  'conference-usa': [
    'Delaware',
    'FIU',
    'Jacksonville State',
    'Kennesaw State',
    'Liberty',
    'Middle Tennessee',
    'Missouri State',
    'New Mexico State',
    'Sam Houston',
    'WKU'
  ],
  'fbs-independent': ['Notre Dame', 'UConn'],
  mac: [
    'Akron',
    'Ball State',
    'Bowling Green',
    'Buffalo',
    'Central Michigan',
    'Eastern Michigan',
    'Kent State',
    'Miami (Ohio)',
    'Ohio',
    'Sacramento State',
    'Toledo',
    'UMass',
    'Western Michigan'
  ],
  'mountain-west': [
    'Air Force',
    'Hawaii',
    'Nevada',
    'New Mexico',
    'North Dakota State',
    'Northern Illinois',
    'San Jose State',
    'UNLV',
    'UTEP',
    'Wyoming'
  ],
  'pac-12': [
    'Boise State',
    'Colorado State',
    'Fresno State',
    'Oregon State',
    'San Diego State',
    'Texas State',
    'Utah State',
    'Washington State'
  ],
  sec: [
    'Alabama',
    'Arkansas',
    'Auburn',
    'Florida',
    'Georgia',
    'Kentucky',
    'LSU',
    'Mississippi State',
    'Missouri',
    'Oklahoma',
    'Ole Miss',
    'South Carolina',
    'Tennessee',
    'Texas',
    'Texas A&M',
    'Vanderbilt'
  ],
  'sun-belt': [
    'Appalachian State',
    'Arkansas State',
    'Coastal Carolina',
    'Georgia Southern',
    'Georgia State',
    'James Madison',
    'Louisiana',
    'Louisiana Tech',
    'Marshall',
    'Old Dominion',
    'South Alabama',
    'Southern Miss',
    'Troy',
    'ULM'
  ]
};

const FBS_CONF_META = {
  acc: { name: 'Atlantic Coast Conference', shortName: 'ACC' },
  american: { name: 'American Athletic Conference', shortName: 'American' },
  'big-12': { name: 'Big 12 Conference', shortName: 'Big 12' },
  'big-ten': { name: 'Big Ten Conference', shortName: 'Big Ten' },
  'conference-usa': { name: 'Conference USA', shortName: 'CUSA' },
  'fbs-independent': { name: 'FBS Independents', shortName: 'Independent' },
  mac: { name: 'Mid-American Conference', shortName: 'MAC' },
  'mountain-west': { name: 'Mountain West Conference', shortName: 'MWC' },
  'pac-12': { name: 'Pac-12 Conference', shortName: 'Pac-12' },
  sec: { name: 'Southeastern Conference', shortName: 'SEC' },
  'sun-belt': { name: 'Sun Belt Conference', shortName: 'Sun Belt', divisions: ['East', 'West'] }
};

const FCS_MEMBERS = {
  'big-sky': [
    'Cal Poly',
    'Eastern Washington',
    'Idaho',
    'Idaho State',
    'Montana',
    'Montana State',
    'Northern Arizona',
    'Northern Colorado',
    'Portland State',
    'Southern Utah',
    'UC Davis',
    'Utah Tech',
    'Weber State'
  ],
  caa: [
    'UAlbany',
    'Bryant',
    'Campbell',
    'Elon',
    'Hampton',
    'Maine',
    'Monmouth',
    'New Hampshire',
    'North Carolina A&T',
    'Rhode Island',
    'Sacred Heart',
    'Stony Brook',
    'Towson'
  ],
  ivy: ['Brown', 'Columbia', 'Cornell', 'Dartmouth', 'Harvard', 'Penn', 'Princeton', 'Yale'],
  meac: [
    'Delaware State',
    'Howard',
    'Morgan State',
    'Norfolk State',
    'North Carolina Central',
    'South Carolina State'
  ],
  mvfc: [
    'Illinois State',
    'Indiana State',
    'Murray State',
    'North Dakota',
    'Northern Iowa',
    'South Dakota',
    'South Dakota State',
    'Southern Illinois',
    'Youngstown State'
  ],
  nec: [
    'Central Connecticut State',
    'Duquesne',
    'LIU',
    'Mercyhurst',
    'New Haven',
    'Robert Morris',
    'Stonehill',
    'Wagner'
  ],
  ovc: [
    'Charleston Southern',
    'Eastern Illinois',
    'Gardner-Webb',
    'Lindenwood',
    'Southeast Missouri',
    'Tennessee State',
    'UT Martin',
    'Western Illinois'
  ],
  patriot: [
    'Bucknell',
    'Colgate',
    'Fordham',
    'Georgetown',
    'Holy Cross',
    'Lafayette',
    'Lehigh',
    'Richmond',
    'Villanova',
    'William & Mary'
  ],
  pioneer: [
    'Butler',
    'Davidson',
    'Dayton',
    'Drake',
    'Marist',
    'Morehead State',
    'Presbyterian',
    'St. Thomas',
    'San Diego',
    'Stetson',
    'Valparaiso'
  ],
  socon: [
    'Chattanooga',
    'ETSU',
    'Furman',
    'Mercer',
    'Samford',
    'Tennessee Tech',
    'The Citadel',
    'VMI',
    'Western Carolina',
    'Wofford'
  ],
  southland: [
    'East Texas A&M',
    'Houston Christian',
    'Lamar',
    'McNeese',
    'Nicholls',
    'Northwestern State',
    'Stephen F. Austin',
    'Southeastern Louisiana',
    'Incarnate Word',
    'UTRGV'
  ],
  swac: [
    'Alabama A&M',
    'Alabama State',
    'Alcorn State',
    'Arkansas-Pine Bluff',
    'Bethune-Cookman',
    'Florida A&M',
    'Grambling State',
    'Jackson State',
    'Mississippi Valley State',
    'Prairie View A&M',
    'Southern',
    'Texas Southern'
  ],
  uac: [
    'Abilene Christian',
    'Austin Peay',
    'Central Arkansas',
    'Eastern Kentucky',
    'North Alabama',
    'Tarleton State',
    'West Florida',
    'West Georgia'
  ],
  'fcs-independent': ['Chicago State', 'Merrimack']
};

const FCS_CONF_META = {
  'big-sky': { name: 'Big Sky Conference', shortName: 'Big Sky' },
  caa: { name: 'Coastal Athletic Association', shortName: 'CAA' },
  ivy: { name: 'Ivy League', shortName: 'Ivy' },
  meac: { name: 'Mid-Eastern Athletic Conference', shortName: 'MEAC' },
  mvfc: { name: 'Missouri Valley Football Conference', shortName: 'MVFC' },
  nec: { name: 'Northeast Conference', shortName: 'NEC' },
  ovc: { name: 'Ohio Valley Conference', shortName: 'OVC' },
  patriot: { name: 'Patriot League', shortName: 'Patriot' },
  pioneer: { name: 'Pioneer Football League', shortName: 'Pioneer' },
  socon: { name: 'Southern Conference', shortName: 'SoCon' },
  southland: { name: 'Southland Conference', shortName: 'Southland' },
  swac: { name: 'Southwestern Athletic Conference', shortName: 'SWAC', divisions: ['East', 'West'] },
  uac: { name: 'United Athletic Conference', shortName: 'UAC' },
  'fcs-independent': { name: 'FCS Independents', shortName: 'Independent' }
};

const META = {
  dataVersion: '2026.11.11',
  alignmentEffective: '2026-07-01',
  sources: [
    'https://fbschedules.com/college-football-realignment-conference-changes-for-2026-take-effect-today/',
    'https://fearthefcs.com/fcs-conferences-and-teams/',
    'https://theanalyst.com/articles/fcs-football-conference-previews-2026'
  ]
};

function buildSchools(members, subdivision, confMeta) {
  const schools = [];
  for (const [confId, names] of Object.entries(members)) {
    for (const name of names) {
      const id = slug(name);
      schools.push({
        id,
        name,
        conferenceId: confId,
        conferenceName: confMeta[confId].name,
        subdivision
      });
    }
  }
  return schools;
}

function buildConferences(meta, subdivision) {
  return Object.entries(meta).map(([id, row]) => ({
    id,
    ...row,
    subdivision
  }));
}

mkdirSync(join(root, 'conferences'), { recursive: true });
mkdirSync(join(root, 'schools'), { recursive: true });

const fbsSchools = buildSchools(FBS_MEMBERS, 'FBS', FBS_CONF_META);
const fcsSchools = buildSchools(FCS_MEMBERS, 'FCS', FCS_CONF_META);

const payload = (schools, conferences) => ({
  meta: META,
  conferences,
  schools
});

writeFileSync(
  join(root, 'conferences', 'fbs_2026.json'),
  `${JSON.stringify(buildConferences(FBS_CONF_META, 'FBS'), null, 2)}\n`
);
writeFileSync(
  join(root, 'conferences', 'fcs_2026.json'),
  `${JSON.stringify(buildConferences(FCS_CONF_META, 'FCS'), null, 2)}\n`
);
writeFileSync(
  join(root, 'schools', 'fbs_2026.json'),
  `${JSON.stringify(payload(fbsSchools, buildConferences(FBS_CONF_META, 'FBS')), null, 2)}\n`
);
writeFileSync(
  join(root, 'schools', 'fcs_2026.json'),
  `${JSON.stringify(payload(fcsSchools, buildConferences(FCS_CONF_META, 'FCS')), null, 2)}\n`
);

console.log(`Wrote ${fbsSchools.length} FBS and ${fcsSchools.length} FCS schools.`);
