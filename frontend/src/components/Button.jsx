import React from 'react';
import LoadingSpinner from './LoadingSpinner';

const baseClasses = "inline-flex items-center justify-center font-semibold transition-all duration-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] min-w-[44px]";

const variants = {
    primary: "bg-red-900 text-white hover:bg-red-800 focus:ring-red-900",
    gold: "bg-[#FFD700] text-red-900 hover:bg-[#E6BE00] focus:ring-[#FFD700]",
    outlineLight: "border border-white text-white hover:bg-white hover:text-black focus:ring-white",
    ghostDark: "text-black hover:text-red-900 focus:ring-gray-300",
    goldLogin: "bg-[#FFD700] text-[#800000] hover:bg-[#FFC700] focus:ring-[#FFD700]",
    maroon: "bg-[#800000] text-white hover:bg-[#900000] focus:ring-[#800000]",
    maroonOutline: "border-2 border-[#800000] text-[#800000] hover:bg-[#800000] hover:text-white focus:ring-[#800000]",
    success: "bg-green-600 text-white hover:bg-green-700 focus:ring-green-600",
    danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-600",
    secondary: "bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-600",
};

const sizes = {
    sm: "px-3 py-2 text-sm min-h-[36px]",
    md: "px-4 py-2 text-base min-h-[44px]",
    lg: "px-6 py-3 text-lg min-h-[52px]",
};

const Button = ({
    as = 'button',
    href,
    onClick,
    children,
    className = '',
    variant = 'primary',
    size = 'md',
    type = 'button',
    loading = false,
    disabled = false,
    'aria-label': ariaLabel,
    ...rest
}) => {
    const Component = href ? 'a' : as;
    const isDisabled = disabled || loading;
    
    const classes = `${baseClasses} ${variants[variant] || ''} ${sizes[size] || ''} ${className}`.trim();
    
    const props = {
        href,
        onClick: isDisabled ? undefined : onClick,
        className: classes,
        type: Component === 'button' ? type : undefined,
        disabled: isDisabled,
        'aria-label': ariaLabel,
        'aria-busy': loading,
        ...rest,
    };
    
    return (
        <Component {...props}>
            {loading ? (
                <>
                    <LoadingSpinner size="tiny" inline color="#ffffff" />
                    <span className="ml-2">{children}</span>
                </>
            ) : (
                children
            )}
        </Component>
    );
}

export default Button;
