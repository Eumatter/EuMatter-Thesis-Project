import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Department and course mappings from RegisterPage.jsx
const departments = [
    'College of Education',
    'College of Architecture and Fine Arts',
    'College of Criminal Justice and Criminology',
    'College of Engineering',
    'College of Nursing and Allied Health Sciences',
    'College of Arts and Sciences',
    'College of Business and Accountancy',
    'College of Computing and Multimedia Studies',
    'College of Maritime Education',
    'College of International Tourism and Hospitality Management'
];

const courses = {
    'College of Education': [
        'Bachelor of Elementary Education',
        'Bachelor of Secondary Education',
        'Bachelor of Culture and Arts Education',
        'Bachelor of Physical Education',
        'Bachelor of Library and Information Science'
    ],
    'College of Architecture and Fine Arts': [
        'Bachelor of Fine Arts',
        'BS in Architecture'
    ],
    'College of Criminal Justice and Criminology': [
        'BS in Criminology'
    ],
    'College of Engineering': [
        'BS in Computer Engineering',
        'BS in Electronics Engineering',
        'BS in Electrical Engineering',
        'BS in Mechanical Engineering',
        'BS in Industrial Engineering',
        'BS in Geodetic Engineering',
        'BS in Civil Engineering'
    ],
    'College of Nursing and Allied Health Sciences': [
        'BS in Nursing',
        'BS in Medical Technology'
    ],
    'College of Arts and Sciences': [
        'Bachelor of Arts in Communication',
        'Bachelor of Arts in Political Science',
        'Bachelor of Arts in English Language',
        'BS in Psychology',
        'BS in Public Administration',
        'BS in Environmental Science',
        'BS in Economics',
        'BS in Biology'
    ],
    'College of Business and Accountancy': [
        'BS in Accountancy',
        'BS in Management Accounting',
        'BS in Office Administration',
        'BS in Business Administration'
    ],
    'College of Computing and Multimedia Studies': [
        'BS in Information Technology',
        'BS in Computer Science',
        'BS in Entertainment & Multimedia Computing'
    ],
    'College of Maritime Education': [
        'BS in Marine Engineering',
        'BS in Marine Transportation'
    ],
    'College of International Tourism and Hospitality Management': [
        'BS in Tourism Management',
        'BS in Hospitality Management'
    ]
};

// Department abbreviations mapping
const departmentAbbreviations = {
    'College of Education': 'COE',
    'College of Architecture and Fine Arts': 'CAFA',
    'College of Criminal Justice and Criminology': 'CCJC',
    'College of Engineering': 'COE',
    'College of Nursing and Allied Health Sciences': 'CONAHS',
    'College of Arts and Sciences': 'CAS',
    'College of Business and Accountancy': 'CBA',
    'College of Computing and Multimedia Studies': 'CCMS',
    'College of Maritime Education': 'CME',
    'College of International Tourism and Hospitality Management': 'CITHM'
};

// Filipino first names
const firstNames = [
    'Juan', 'Maria', 'Jose', 'Ana', 'Carlos', 'Rosa', 'Miguel', 'Carmen',
    'Antonio', 'Elena', 'Francisco', 'Isabel', 'Manuel', 'Patricia', 'Pedro', 'Lourdes',
    'Ricardo', 'Teresa', 'Roberto', 'Cristina', 'Fernando', 'Angela', 'Alberto', 'Monica',
    'Eduardo', 'Rebecca', 'Alfredo', 'Victoria', 'Ramon', 'Sofia', 'Enrique', 'Andrea',
    'Felipe', 'Gabriela', 'Rodrigo', 'Daniela', 'Sergio', 'Valentina', 'Andres', 'Camila',
    'Luis', 'Isabella', 'Jorge', 'Lucia', 'Diego', 'Amanda', 'Raul', 'Natalia',
    'Oscar', 'Elena', 'Pablo', 'Claudia', 'Victor', 'Laura', 'Hector', 'Mariana',
    'Rafael', 'Fernanda', 'Gustavo', 'Adriana', 'Mario', 'Carolina', 'Julio', 'Beatriz'
];

// Filipino last names
const lastNames = [
    'Santos', 'Reyes', 'Cruz', 'Bautista', 'Ocampo', 'Garcia', 'Mendoza', 'Torres',
    'Andres', 'Villanueva', 'Fernandez', 'Ramos', 'Gonzales', 'Delos Santos', 'Rivera', 'Lopez',
    'Martinez', 'Dela Cruz', 'Gutierrez', 'Castillo', 'Morales', 'Diaz', 'Romero', 'Alvarez',
    'Moreno', 'Jimenez', 'Herrera', 'Medina', 'Aguilar', 'Vargas', 'Ortega', 'Silva',
    'Flores', 'Navarro', 'Mendez', 'Guerrero', 'Pena', 'Rojas', 'Vega', 'Castro',
    'Soto', 'Contreras', 'Valdez', 'Marquez', 'Acosta', 'Fuentes', 'Paredes', 'Salazar'
];

// Cities/Addresses in Philippines
const addresses = [
    'Manila', 'Quezon City', 'Makati', 'Taguig', 'Pasig', 'Mandaluyong', 'San Juan', 'Marikina',
    'Caloocan', 'Las Pinas', 'Paranaque', 'Muntinlupa', 'Valenzuela', 'Malabon', 'Navotas', 'Pasay',
    'Lucena', 'Batangas City', 'Lipa', 'Tanauan', 'Calamba', 'San Pablo', 'Santa Rosa', 'Binan',
    'Cabuyao', 'San Pedro', 'Los Banos', 'Bay', 'Calauan', 'Alaminos', 'Nagcarlan', 'Rizal'
];

// Gender options
const genders = ['Male', 'Female', 'Other', 'Prefer not to say'];

// Student year options
const studentYears = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year', 'Graduate'];

// Generate random date between start and end
function randomDate(start, end) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Generate random integer between min and max (inclusive)
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Get random element from array
function randomElement(array) {
    return array[Math.floor(Math.random() * array.length)];
}

// Generate MSEUF Student email (A22-34197@student.mseuf.edu.ph or T22-34197@student.mseuf.edu.ph)
function generateStudentEmail() {
    const prefix = randomElement(['A', 'T', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S']);
    const year = String(randomInt(20, 25)).padStart(2, '0');
    const id = String(randomInt(10000, 99999)).padStart(5, '0');
    return `${prefix}${year}-${id}@student.mseuf.edu.ph`;
}

// Generate MSEUF Faculty/Staff email
function generateFacultyStaffEmail(firstName, lastName) {
    const first = firstName.toLowerCase();
    const last = lastName.toLowerCase().replace(/\s+/g, '');
    return `${first}.${last}@mseuf.edu.ph`;
}

// Generate Outsider email
function generateOutsiderEmail(firstName, lastName) {
    const first = firstName.toLowerCase();
    const last = lastName.toLowerCase().replace(/\s+/g, '');
    const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com'];
    return `${first}.${last}@${randomElement(domains)}`;
}

// Generate phone number
function generatePhoneNumber() {
    const prefixes = ['0917', '0918', '0919', '0920', '0921', '0922', '0923', '0925', '0926', '0927', '0928', '0929', '0930', '0931', '0932', '0933', '0934', '0935', '0936', '0937', '0938', '0939', '0940', '0941', '0942', '0943', '0945', '0946', '0947', '0948', '0949', '0950', '0951', '0952', '0953', '0954', '0955', '0956', '0961', '0962', '0963', '0965', '0966', '0967', '0968', '0969', '0970', '0971', '0973', '0974', '0975', '0976', '0977', '0978', '0979', '0981', '0982', '0983', '0985', '0986', '0987', '0988', '0989', '0991', '0992', '0993', '0994', '0995', '0996', '0997', '0998', '0999'];
    const suffix = String(randomInt(1000000, 9999999));
    return randomElement(prefixes) + suffix;
}

// Generate birthday (age between 18-65)
function generateBirthday() {
    const now = new Date();
    const maxAge = 65;
    const minAge = 18;
    const year = now.getFullYear() - randomInt(minAge, maxAge);
    const month = randomInt(0, 11);
    const day = randomInt(1, 28);
    return new Date(year, month, day);
}

// Generate createdAt date between Jan 1, 2025 and Nov 30, 2025
function generateCreatedAt() {
    const start = new Date('2025-01-01');
    const end = new Date('2025-11-30');
    return randomDate(start, end);
}

// Extract mseufId from email
function extractMseufId(email) {
    if (email.includes('@student.mseuf.edu.ph')) {
        const match = email.match(/^([A-Z]\d{2}-\d{5})@student\.mseuf\.edu\.ph$/i);
        return match ? match[1].toUpperCase() : '';
    } else if (email.includes('@mseuf.edu.ph')) {
        return email.split('@')[0];
    }
    return '';
}

// Hash password (using same password for all: "Password123!")
async function hashPassword() {
    return await bcrypt.hash('Password123!', 10);
}

// Generate users
async function generateUsers() {
    const users = [];
    const passwordHash = await hashPassword();
    
    // Distribution: 18 Students, 7 Faculty, 4 Staff, 6 Alumni, 3 External Partner, 2 General Public
    const distribution = [
        { type: 'MSEUF', category: 'Student', count: 18 },
        { type: 'MSEUF', category: 'Faculty', count: 7 },
        { type: 'MSEUF', category: 'Staff', count: 4 },
        { type: 'Outsider', category: 'Alumni', count: 6 },
        { type: 'Outsider', category: 'External Partner', count: 3 },
        { type: 'Outsider', category: 'General Public', count: 2 }
    ];
    
    let userIndex = 0;
    
    for (const dist of distribution) {
        for (let i = 0; i < dist.count; i++) {
            const firstName = randomElement(firstNames);
            const lastName = randomElement(lastNames);
            const name = `${firstName} ${lastName}`;
            const gender = randomElement(genders);
            const birthday = generateBirthday();
            const address = randomElement(addresses);
            const contact = generatePhoneNumber();
            const createdAt = generateCreatedAt();
            
            let email, mseufId, mseufCategory, outsiderCategory, studentYear, department, course, userType, role;
            
            userType = dist.type;
            role = 'User';
            
            if (dist.type === 'MSEUF') {
                mseufCategory = dist.category;
                outsiderCategory = '';
                
                if (dist.category === 'Student') {
                    email = generateStudentEmail();
                    mseufId = extractMseufId(email);
                    studentYear = randomElement(studentYears);
                    department = randomElement(departments);
                    course = randomElement(courses[department]);
                } else {
                    // Faculty or Staff
                    email = generateFacultyStaffEmail(firstName, lastName);
                    mseufId = extractMseufId(email);
                    studentYear = '';
                    department = randomElement(departments);
                    course = '';
                }
            } else {
                // Outsider
                mseufCategory = '';
                mseufId = '';
                studentYear = '';
                department = '';
                course = '';
                outsiderCategory = dist.category;
                email = generateOutsiderEmail(firstName, lastName);
            }
            
            const user = {
                name,
                email,
                password: passwordHash,
                role,
                profileImage: '',
                birthday,
                gender,
                address,
                contact,
                userType,
                mseufCategory,
                outsiderCategory,
                studentYear,
                department,
                course,
                mseufId,
                verifyOtp: '',
                verifyOtpExpireAt: 0,
                verifyOtpAttempts: 0,
                verifyOtpLastAttempt: 0,
                isAccountVerified: true,
                resetOtp: '',
                resetOtpExpireAt: 0,
                createdAt,
                updatedAt: createdAt
            };
            
            users.push(user);
            userIndex++;
        }
    }
    
    return users;
}

// Main execution
async function main() {
    try {
        console.log('Generating 40 random users...');
        const users = await generateUsers();
        
        console.log(`Generated ${users.length} users`);
        console.log('User types breakdown:');
        const breakdown = {};
        users.forEach(user => {
            const key = `${user.userType} - ${user.mseufCategory || user.outsiderCategory}`;
            breakdown[key] = (breakdown[key] || 0) + 1;
        });
        console.log(breakdown);
        
        // Save to data.txt
        const dataPath = path.join(__dirname, '../../data.txt');
        fs.writeFileSync(dataPath, JSON.stringify(users, null, 2));
        console.log(`\nData saved to: ${dataPath}`);
        console.log(`Total users: ${users.length}`);
        
    } catch (error) {
        console.error('Error generating users:', error);
        process.exit(1);
    }
}

main();

