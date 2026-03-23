module.exports = {
  default: {
    historical: jest.fn().mockResolvedValue([]),
    quoteSummary: jest.fn().mockResolvedValue({}),
  },
};
