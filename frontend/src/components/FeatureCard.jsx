import React from 'react';

// This is the component you will map over your 'features' array with
const FeatureCard = ({ title, description, icon, iconBg }) => {
    return (
        <div className="flex flex-col items-start p-6 bg-white rounded-xl shadow-2xl transition-all duration-300 hover:shadow-maroon-lg hover:-translate-y-1 border border-gray-100">
            
            {/* // 1. Prominent Icon Area 
              // Using a bigger container and a distinctive gold accent border 
            */}
            <div className={`
                ${iconBg} 
                p-4 mb-6 rounded-2xl 
                border-4 border-gold-400 
                shadow-inner shadow-maroon-100/50 
                transform transition-transform duration-500 ease-out 
                hover:rotate-1 hover:scale-[1.03]
            `}>
                {/* // The actual animated icon goes here. 
                  // It will take up the full space of the container. 
                */}
                {icon}
            </div>

            {/* 2. Title and Description */}
            <h3 className="text-2xl font-extrabold text-maroon-800 mb-3 leading-snug">
                {title}
            </h3>
            <p className="text-gray-600 text-base">
                {description}
            </p>
            
            {/* 3. Subtle Call to Action */}
            <button className="mt-4 text-sm font-semibold text-gold-600 hover:text-gold-700 transition-colors">
                Learn More →
            </button>
        </div>
    );
};

export default FeatureCard;

// NOTE: You would need to ensure Tailwind CSS is configured 
// with your specific 'maroon' and 'gold' custom colors.