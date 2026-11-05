"use client";

import { useParams } from "next/navigation";

import CampaignExperience from "@/components/CampaignExperience";

export default function GamePage() {
  const params = useParams();

  const id = Array.isArray(params.gameId)
    ? params.gameId[0]
    : params.gameId;

  return id
    ? <CampaignExperience key={id} gameId={id} />
    : <p>Invalid campaign link.</p>;
}
