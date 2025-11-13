import React from 'react'

const baseClasses = "inline-flex items-center justify-center font-semibold transition-colors duration-200 rounded-lg";

const variants = {
    primary: "bg-red-900 text-white hover:bg-red-800",
    gold: "bg-[#FFD700] text-red-900 hover:bg-[#E6BE00]", // This 'gold' variant had maroon text.
    outlineLight: "border border-white text-white hover:bg-white hover:text-black",
    ghostDark: "text-black hover:text-red-900",
    // NEW VARIANT FOR LOGIN BUTTON
    goldLogin: "bg-[#FFD700] text-[#800000] hover:bg-[#FFC700]", // Gold background, maroon text
    // Maroon variants
    maroon: "bg-[#800000] text-white hover:bg-[#900000]",
    maroonOutline: "border-2 border-[#800000] text-[#800000] hover:bg-[#800000] hover:text-white",
};

const sizes = {
    sm: "px-3 py-2 text-sm",
    md: "px-4 py-2",
    lg: "px-6 py-3 text-lg",
};

const Button = ({
    as = 'button',
    href,
    onClick,
    children,
    className = '', // This className will now *extend* or *override* variant/size classes
    variant = 'primary',
    size = 'md',
    type = 'button',
    ...rest
}) => {
    const Component = href ? 'a' : as;
    // IMPORTANT: Ensure className comes LAST so it can override or extend
    // existing variant/size styles.
    const classes = `${baseClasses} ${variants[variant] || ''} ${sizes[size] || ''} ${className}`.trim();
    const props = {
        href,
        onClick,
        className: classes,
        type: Component === 'button' ? type : undefined,
        ...rest,
    };
    return <Component {...props}>{children}</Component>;
}

export default Button;