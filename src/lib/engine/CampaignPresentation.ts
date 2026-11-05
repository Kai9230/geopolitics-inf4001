import type { CampaignState } from "../../types/game-state";
import type { RecordedEvent } from "./ReplayRules";

export type PresentedEvent = RecordedEvent;
export type CampaignModel = {
  live: CampaignState | null;
  events: PresentedEvent[];
  cursor: number | null;
  playing: PresentedEvent | null;
};

export type CampaignUpdate =
  | { type: "live"; state: CampaignState }
  | { type: "events"; events: PresentedEvent[] }
  | { type: "confirmed"; state: CampaignState; event: PresentedEvent }
  | { type: "finish"; revision: number };

export const initialCampaignModel: CampaignModel = {
  live: null, events: [], cursor: null, playing: null,
};

function merge(current: PresentedEvent[], incoming: PresentedEvent[]) {
  const events = new Map(current.map(event => [event.revision, event]));
  for (const event of incoming) {
    const previous = events.get(event.revision);
    events.set(event.revision, {
      ...previous,
      ...event,
      commentary: event.commentary ?? previous?.commentary,
    });
  }
  return [...events.values()].sort((a,b) => a.revision - b.revision);
}

function queue(model: CampaignModel): CampaignModel {
  if (model.cursor === null || model.playing) return model;
  let cursor = model.cursor;

  for (const event of model.events) {
    if (event.revision <= cursor) continue;
    if (event.dice && event.fromId && event.toId) {
      return { ...model, cursor, playing: event };
    }
    cursor = event.revision;
  }

  return { ...model, cursor };
}

export function campaignReducer(
  model: CampaignModel,
  action: CampaignUpdate
): CampaignModel {
  if (action.type === "confirmed") {
    const live = model.live && model.live.revision > action.state.revision
      ? model.live
      : action.state;

    return queue({
      ...model,
      live,
      events: merge(model.events, [action.event]),
    });
  }

  if (action.type === "live") {
    if (model.live && action.state.revision < model.live.revision) return model;
    return queue({ ...model, live: action.state });
  }

  if (action.type === "events") {
    const events = merge(model.events, action.events);
    return queue({
      ...model,
      events,
      cursor: model.cursor ?? events.at(-1)?.revision ?? null,
    });
  }

  if (model.playing?.revision !== action.revision) return model;
  return queue({ ...model, playing: null, cursor: action.revision });
}

export function createdCampaignModel(
  state: CampaignState | null
): CampaignModel {
  if (!state || state.revision !== 0) return initialCampaignModel;

  return {
    live: state,
    cursor: 0,
    playing: null,
    events: [{
      revision: 0,
      actorId: "system",
      action: "setup",
      message: "Campaign created.",
      createdAt: state.createdAt,
      dice: null,
      afterState: state,
    }],
  };
}
