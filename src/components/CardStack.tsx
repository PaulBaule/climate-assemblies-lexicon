import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Box } from '@chakra-ui/react';
import type { CardOptionValue } from '../types';

const CARD_OFFSET = 8;
const SCALE_FACTOR = 0.09;

interface CardStackProps {
  items: CardOptionValue[];
  activeItem: CardOptionValue;
  renderCard: (item: CardOptionValue) => React.ReactNode;
  isAnimating: boolean;
}

export const CardStack = ({ items, activeItem, renderCard, isAnimating }: CardStackProps) => {
  const [cardsToRender, setCardsToRender] = useState<CardOptionValue[]>([]);

  useEffect(() => {
    if (!activeItem) {
      setCardsToRender([]);
      return;
    }
    
    if (items.length === 0) {
      setCardsToRender([activeItem]);
      return;
    }

    const activeIndex = items.findIndex(item => item.id ? item.id === activeItem.id : item.content === activeItem.content);

    if (activeIndex === -1) {
        setCardsToRender([activeItem]);
        return;
    }

    const newCards = [];
    for (let i = 0; i < Math.min(items.length, 3); i++) {
      const itemIndex = (activeIndex + i) % items.length;
      newCards.push(items[itemIndex]);
    }
    setCardsToRender(newCards);

  }, [activeItem, items]);

  return (
    <Box position="relative" h="340px" w="340px">
      <AnimatePresence>
        {cardsToRender.map((card, index) => {
          if (!card) return null;
          return (
            <motion.div
              key={card.id || card.content}
              style={{
                transformOrigin: 'top center',
                position: 'absolute',
                width: '340px',
                height: '340px',
              }}
              initial={{
                top: CARD_OFFSET,
                scale: 1 - SCALE_FACTOR,
                opacity: 0,
              }}
              animate={{
                top: index * -CARD_OFFSET,
                scale: 1 - index * SCALE_FACTOR,
                zIndex: cardsToRender.length - index,
                opacity: index === 0 ? 1 : index === 1 ? 0.5 : 0.2,
              }}
              exit={{
                top: -CARD_OFFSET * 2,
                opacity: 0,
                scale: 1 - SCALE_FACTOR * 2,
                zIndex: 0,
              }}
              transition={{
                duration: isAnimating ? 0.2 : 0,
              }}
            >
                <Box
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  bg="white"
                  p={0}
                  borderRadius="30px"
                  boxShadow="xl"
                  w="340px"
                  h="340px"
                  minH="340px"
                  overflow="hidden"
                >
                 {index === 0 ? renderCard(card) : null}
                </Box>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </Box>
  );
}; 