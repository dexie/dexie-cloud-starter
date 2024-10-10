// components/ItemCard.tsx

"use client"

import React, { useRef, useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { CardContent, Typography, CardMedia } from "@mui/material"
import { styled } from "@mui/material/styles"
import { ICard } from "../db/db"

// Definiera höjdgränser
const HEIGHT_THRESHOLD = 500 // px - Innehållshöjd för skalning
const FIXED_HEIGHT = 200 // px - Fast höjd när skalning appliceras

// Styled ContentCard med dynamisk höjd och overflow hantering
export const ContentCard = styled("div")<{ isScaled: boolean }>(
  ({ theme, isScaled }) => ({
    height: isScaled ? `${FIXED_HEIGHT}px` : "auto", // Fast höjd om skalad, annars auto
    display: "flex",
    flexDirection: "column",
    boxShadow: "3px 10px 37px -4px rgba(42, 52, 68, 0.5)",
    cursor: "pointer",
    transition: "transform 0.2s, box-shadow 0.2s, height 0.3s",
    overflow: isScaled ? "hidden" : "visible", // Dölj överflödigt innehåll om skalad
    position: "relative",
    borderRadius: "6px",
    "&:hover": {
      transform: "scale(1.02)",
      boxShadow: "4px 12px 40px -4px rgba(42, 52, 68, 0.6)",
      outline: "2px solid gray",
    },
    "&:focus": {
      outline: "2px solid gray",
    },
  })
)

// Wrapper för innehållet som kan skalas vertikalt
export const ContentWrapper = styled("div")<{ scaleFactor: number }>(
  ({ scaleFactor }) => ({
    zoom: scaleFactor < 1 ? "0.5" : "1", // Justera skalning
    transformOrigin: "top left",
    transition: "transform 0.3s",
    width: "100%",
    overflowX: "hidden",
  })
)

interface ItemCardProps {
  item: ICard
}

const ItemCard: React.FC<ItemCardProps> = ({ item }) => {
  const router = useRouter()
  const contentRef = useRef<HTMLDivElement>(null)
  const [isScaled, setIsScaled] = useState(false)
  const [scaleFactor, setScaleFactor] = useState(1)

  useEffect(() => {
    console.log("ItemCard rendered", scaleFactor)
  }, [scaleFactor])

  const handleClick = () => {
    router.push(`/everything?edit=${item.id}`)
  }

  useEffect(() => {
    if (contentRef.current) {
      const contentHeight = contentRef.current.scrollHeight
      if (contentHeight > HEIGHT_THRESHOLD) {
        const newScaleFactor = FIXED_HEIGHT / contentHeight
        setScaleFactor(newScaleFactor < 1 ? newScaleFactor : 1)
        setIsScaled(newScaleFactor < 1)
      } else {
        setScaleFactor(1)
        setIsScaled(false)
      }
    }
  }, [item.description, item.content])

  return (
    <ContentCard
      onClick={handleClick}
      isScaled={isScaled}
      tabIndex={0}
      aria-label={`Edit item ${item.id}`}
    >
      <ContentWrapper scaleFactor={scaleFactor}>
        <div ref={contentRef}>
          {item.type === "text" && (
            <CardContent>
              <Typography variant="body1" gutterBottom>
                <div
                  className="editor-content"
                  dangerouslySetInnerHTML={{
                    __html: item?.description || "",
                  }}
                />
              </Typography>
            </CardContent>
          )}
          {item.type === "image" && item.content && (
            <>
              <CardMedia
                component="img"
                image={item?.content[0]}
                alt={item.description}
                sx={{
                  height: "200px",
                  objectFit: "cover", // Säkerställ att bilden täcker området
                }}
              />
              <CardContent>
                <Typography variant="body1" gutterBottom>
                  {item.description}
                </Typography>
              </CardContent>
            </>
          )}
        </div>
      </ContentWrapper>
      {/* Lägg till en gradient för att indikera att innehåll döljs */}
      {isScaled && (
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width: "100%",
            height: "50px",
            background: "linear-gradient(to top, white, transparent)",
          }}
        />
      )}
    </ContentCard>
  )
}

export default ItemCard
