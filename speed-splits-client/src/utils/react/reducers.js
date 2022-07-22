import {
  timerActions,
  editRunActions,
  timerStatus,
  editRunStatus,
} from "../../models/constants";
import { Run, Split } from "../../models/core";
import Clone from "../Clone";
import { ReducerError } from "../errors";
import { Time } from "../formatting";
import Storage from "../Storage";

/**************** TIMER ****************/

export const initialTimerState = {
  status: timerStatus.INITIAL,
  splits: [],
  currentSplit: 0,
  time: 0,
  timestampRef: 0,
  recordedTimes: [],
};
export function timerStateReducer(state, action) {
  const statuses = timerStatus;
  let newState;
  switch (action.type) {
    case timerActions.INITIALIZE: {
      let currentSplit = 0,
        status = statuses.INITIAL,
        time = 0,
        timestampRef = 0,
        recordedTimes = [];
      let splits = Storage.Get(Storage.Keys.SPLITS.id);
      if (!splits) {
        splits = Storage.Get(Storage.Keys.SELECTED_RUN.id)?.splits || [];
      } else {
        currentSplit = Storage.Get(Storage.Keys.CURRENT_SPLIT.id) || 0;
        status = Storage.Get(Storage.Keys.STATUS.id) || statuses.INITIAL;
        time = Storage.Get(Storage.Keys.CURRENT_TIME.id) || 0;
        timestampRef = Storage.Get(Storage.Keys.TIMESTAMP_REF.id) || 0;
        recordedTimes = Storage.Get(Storage.Keys.RECORDED_TIMES.id) || [];
      }
      newState = {
        time,
        splits,
        currentSplit,
        status,
        timestampRef,
        recordedTimes,
      };
      break;
    }
    case timerActions.START: {
      newState = {
        ...state,
        status: statuses.RUNNING,
        timestampRef: Time.now(),
      };
      break;
    }
    case timerActions.TICK: {
      const msSinceRef = Time.now() - state.timestampRef;
      const time = msSinceRef + state.recordedTimes.reduce((a, b) => a + b, 0);
      newState = { ...state, time };
      break;
    }
    case timerActions.PAUSE_RESUME: {
      if (state.status === statuses.RUNNING) {
        newState = {
          ...state,
          status: statuses.PAUSED,
          recordedTimes: [
            ...state.recordedTimes,
            Time.now() - state.timestampRef,
          ],
        };
      }
      if (state.status === statuses.PAUSED) {
        newState = {
          ...state,
          status: statuses.RUNNING,
          timestampRef: Time.now(),
        };
      }
      break;
    }
    case timerActions.SPLIT: {
      if (state.currentSplit >= state.splits.length) {
        newState = { ...state, status: statuses.STOPPED };
        break;
      }
      const splits = state.splits;
      const splitToAdd = splits.find((s) => s.order === state.currentSplit);
      splitToAdd.time = state.time;
      const currentSplit = state.currentSplit + 1;
      newState = {
        ...state,
        splits,
        currentSplit,
      };
      break;
    }
    case timerActions.UNDO: {
      if (state.currentSplit === 0) {
        newState = state;
        break;
      }
      const splits = state.splits;
      const splitToRemove = splits.find(
        (s) => s.order === state.currentSplit - 1
      );
      splitToRemove.time = null;
      const currentSplit = state.currentSplit - 1;
      newState = {
        ...state,
        splits,
        currentSplit,
      };
      break;
    }
    case timerActions.RESET: {
      newState = {
        status: statuses.INITIAL,
        time: 0,
        splits: state.splits.map((s) => ({ ...s, time: null })),
        currentSplit: 0,
        timestampRef: 0,
        recordedTimes: [],
      };
      Storage.DeleteAll();
      break;
    }
    case timerActions.STOP: {
      newState = { ...state, status: statuses.STOPPED };
      break;
    }
    default:
      throw new ReducerError(action.type);
  }
  saveTimerStateChanges(state, newState);
  return newState;
}
function saveTimerStateChanges(oldState, newState) {
  if (oldState.currentSplit !== newState.currentSplit)
    Storage.AddOrUpdate(Storage.Keys.CURRENT_SPLIT.id, newState.currentSplit);
  if (oldState.currentTime !== newState.currentTime)
    Storage.AddOrUpdate(Storage.Keys.CURRENT_TIME.id, newState.currentTime);
  if (oldState.splits !== newState.splits)
    Storage.AddOrUpdate(Storage.Keys.SPLITS.id, newState.splits);
  if (oldState.recordedTimes !== newState.recordedTimes)
    Storage.AddOrUpdate(Storage.Keys.RECORDED_TIMES.id, newState.recordedTimes);
  if (oldState.status !== newState.status)
    Storage.AddOrUpdate(Storage.Keys.STATUS.id, newState.status);
  if (oldState.timestampRef !== newState.timestampRef)
    Storage.AddOrUpdate(Storage.Keys.TIMESTAMP_REF.id, newState.timestampRef);
}

/**************** EDIT RUN ****************/

export const initialEditRunState = {
  droppedItem: -1,
  newSplit: new Split(),
  originalTitle: "",
  originalOrder: null,
  runs: [],
  selectedItem: -1,
  selectedRun: -1,
  status: editRunStatus.INITIAL,
  splits: [],
};
export function editRunReducer(state, action) {
  const statuses = editRunStatus;
  let newState;
  switch (action.type) {
    case editRunActions.INITIALIZE: {
      const data = Storage.Get(Storage.Keys.SETTINGS.id);
      if (!data) {
        newState = { ...state };
        break;
      }
      const runs = Storage.Get(Storage.Keys.RUNS.id);
      let selectedRun = Storage.Get(Storage.Keys.SELECTED_RUN.id);

      if (selectedRun >= 0 && runs.length > 0) {
        data.splits = runs[selectedRun].splits;
      } else {
        selectedRun = 0;
        runs.push(new Run());
      }
      if (
        data.status === statuses.EDITING &&
        data.originalTitle &&
        data.selectedItem >= 0
      ) {
        data.splits[data.selectedItem] = data.originalTitle;
        data.originalTitle = "";
        data.selectedItem = -1;
      } else if (data.status === statuses.EDITING && data.originalOrder) {
        data.splits = data.originalOrder;
        data.originalOrder = null;
      }
      newState = { ...data, runs, selectedRun };
      break;
    }
    case editRunActions.ADD_ITEM: {
      newState = {
        ...state,
        status: statuses.ADDING,
        newSplit: new Split(),
      };
      break;
    }
    case editRunActions.EDIT_ITEM: {
      const index = action.data.i;
      const originalTitle = state.splits[index].title;
      newState = {
        ...state,
        originalTitle,
        selectedItem: index,
        status: statuses.EDITING,
      };
      break;
    }
    case editRunActions.EDIT_TITLE: {
      const originalTitle = state.runs[state.selectedRun].name;
      newState = { ...state, originalTitle, status: statuses.EDITING_TITLE };
      break;
    }
    case editRunActions.DELETE_ITEM: {
      newState = {
        ...state,
        selectedItem: action.data.i,
        status: statuses.DELETING,
      };
      break;
    }
    case editRunActions.DELETE_CONFIRMED: {
      const splits = state.splits.filter((_, i) => i !== state.selectedItem);
      const runs = state.runs;
      runs[state.selectedRun].splits = splits;
      newState = {
        ...state,
        runs,
        splits,
        selectedItem: -1,
        status: statuses.INITIAL,
      };
      break;
    }
    case editRunActions.ORDER_ITEMS: {
      newState = {
        ...state,
        status: statuses.ORDERING,
        originalOrder: Clone.Simple(state.splits),
      };
      break;
    }
    case editRunActions.SAVE: {
      const status = state.status;
      if (status === statuses.ADDING) {
        if (!state.newSplit.title) {
          newState = {
            ...state,
            newSplit: new Split(),
            status: statuses.INITIAL,
          };
          break;
        }

        const newSplit = state.newSplit;
        newSplit.order = state.splits.length;
        const splits = [...state.splits, newSplit];

        const runs = state.runs;
        if (state.selectedRun >= 0) runs[state.selectedRun].splits = splits;
        else runs.push(new Run(null, splits));

        newState = {
          ...state,
          runs,
          splits,
          newSplit: new Split(),
        };
      } else if (
        status === statuses.EDITING ||
        status === statuses.EDITING_TITLE
      ) {
        newState = {
          ...state,
          selectedItem: -1,
          originalTitle: "",
        };
      } else if (status === statuses.ORDERING) {
        const runs = state.runs;
        runs[state.selectedRun].splits = state.splits;
        newState = {
          ...state,
          originalOrder: null,
          runs,
        };
      }
      newState.status = statuses.INITIAL;
      break;
    }
    case editRunActions.UPDATE: {
      const status = state.status;
      if (status === statuses.ADDING) {
        const newSplit = state.newSplit;
        newSplit.title = action.data.value;
        newState = { ...state, newSplit };
      } else if (status === statuses.EDITING) {
        const splits = state.splits;
        splits[action.data.i].title = action.data.value;
        const runs = state.runs;
        runs[state.selectedRun].splits = splits;
        newState = { ...state, splits, runs };
      } else if (status === statuses.EDITING_TITLE) {
        const runs = state.runs;
        runs[state.selectedRun].name = action.data.value;
        newState = { ...state, runs };
      }
      break;
    }
    case editRunActions.CANCEL: {
      const status = state.status;
      if (status === statuses.ADDING) {
        newState = {
          ...state,
          newSplit: new Split(),
        };
      } else if (status === statuses.EDITING) {
        const splits = state.splits;
        splits[state.selectedItem].title = state.originalTitle;
        newState = {
          ...state,
          splits,
          selectedItem: -1,
          originalTitle: "",
        };
      } else if (status === statuses.DELETING) {
        newState = {
          ...state,
          selectedItem: -1,
        };
      } else if (status === statuses.ORDERING) {
        newState = {
          ...state,
          splits: state.originalOrder,
          originalOrder: null,
        };
      } else if (status === statuses.EDITING_TITLE) {
        const runs = state.runs;
        runs[state.selectedRun].name = state.originalTitle;
        newState = {
          ...state,
          runs,
          originalTitle: "",
        };
      }
      newState.status = statuses.INITIAL;
      break;
    }
    case editRunActions.ORDER_DRAG_START:
      newState = { ...state, selectedItem: action.data.i };
      break;
    case editRunActions.ORDER_DRAG_OVER:
      newState = { ...state, droppedItem: action.data.i };
      break;
    case editRunActions.ORDER_DROP: {
      const dragged = state.splits[state.selectedItem],
        dropped = state.splits[state.droppedItem];
      const splits = state.splits.map((v, i) => {
        if (i === state.selectedItem) v = dropped;
        if (i === state.droppedItem) v = dragged;
        v.order = i;
        return v;
      });
      newState = { ...state, splits, selectedItem: -1, droppedItem: -1 };
      break;
    }
    default:
      throw new ReducerError(action.type);
  }
  saveEditRunStateChanges(state, newState);
  return newState;
}
function saveEditRunStateChanges(oldState, newState) {
  Storage.AddOrUpdate(Storage.Keys.SETTINGS.id, newState);
  if (oldState.RUNS !== newState.RUNS)
    Storage.AddOrUpdate(Storage.Keys.RUNS.id, newState.runs);
  if (oldState.SELECTED_RUN !== newState.SELECTED_RUN)
    Storage.AddOrUpdate(Storage.Keys.SELECTED_RUN.id, newState.selectedRun);
}
