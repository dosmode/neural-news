import KeywordNode from '../KeywordNode';
import FilterNode from '../FilterNode';
import WeightEdge from '../WeightEdge';

export const nodeTypes = {
  keyword: KeywordNode,
  filter: FilterNode,
};

export const edgeTypes = {
  weight: WeightEdge,
};
