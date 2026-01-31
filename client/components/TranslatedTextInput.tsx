import React from 'react';
import { TextInput, TextInputProps } from 'react-native';
import { useLanguage } from '@/context/LanguageContext';
import { autoTranslate } from '@/lib/auto-translate';
import { useTheme } from '@/hooks/useTheme';

export function TranslatedTextInput({ placeholder, ...props }: TextInputProps) {
  const { language } = useLanguage();
  const { theme } = useTheme();
  
  const translatedPlaceholder = placeholder 
    ? autoTranslate(placeholder, language) 
    : undefined;

  return (
    <TextInput
      {...props}
      placeholder={translatedPlaceholder}
      placeholderTextColor={props.placeholderTextColor || theme.textSecondary}
    />
  );
}