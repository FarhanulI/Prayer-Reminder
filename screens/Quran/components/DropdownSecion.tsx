import Dropdown, { DropdownOption } from '@/components/Dropdown';
import { useSurahsLists } from '@/hooks/Quran/use-surah-list';
import { useIsFocused } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';

const languageList = [
    { id: 1, name: 'English', key: 'en' },
    { id: 21, name: 'Bengali', key: 'bn' },
]

interface DropdownSecionProps {
    onSelectSurah: (value: DropdownOption) => void;
}

const DropdownSecion = ({ onSelectSurah }: DropdownSecionProps): React.ReactNode => {
    const isFocused = useIsFocused();
    const [language, setLanguage] = useState<DropdownOption>(languageList[0]);
    const [surah, setSurah] = useState<DropdownOption>();

    const { data: surahsList, isLoading } = useSurahsLists({ lang: language.key, enabled: isFocused })

    useEffect(() => {
        return () => {
            setLanguage(languageList[0]);
            setSurah(undefined)
        }
    }, [isFocused])


    return (
        <View className="flex-row justify-between mb-4">
            <Dropdown
                label="Language"
                value={language?.name}
                options={languageList}
                onSelect={(item) => setLanguage(item)}
                containerStyle="flex-1 mr-2"
            />
            <Dropdown
                label="Surah"
                value={surah?.name || surahsList?.[0]?.name}
                options={surahsList}
                onSelect={(item) => { setSurah(item); onSelectSurah(item) }}
                containerStyle="flex-1 ml-2"
                isLoading={isLoading}
            />
        </View>
    )
}

export default DropdownSecion