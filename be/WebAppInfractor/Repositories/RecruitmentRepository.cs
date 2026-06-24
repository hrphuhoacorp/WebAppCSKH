using WebAppInfractor.Data;
using WebAppInfractor.Models.Recruitment;

public interface IRecruitmentCampaignRepository : IRepository<RecruitmentCampaign> { }

public class RecruitmentCampaignRepository : Repository<RecruitmentCampaign>, IRecruitmentCampaignRepository
{
    public RecruitmentCampaignRepository(MemBerContext context) : base(context) { }
}

public interface IRecruitmentCandidateRepository : IRepository<RecruitmentCandidate> { }

public class RecruitmentCandidateRepository : Repository<RecruitmentCandidate>, IRecruitmentCandidateRepository
{
    public RecruitmentCandidateRepository(MemBerContext context) : base(context) { }
}

public interface IRecruitmentCandidateHistoryRepository : IRepository<RecruitmentCandidateHistory> { }

public class RecruitmentCandidateHistoryRepository : Repository<RecruitmentCandidateHistory>, IRecruitmentCandidateHistoryRepository
{
    public RecruitmentCandidateHistoryRepository(MemBerContext context) : base(context) { }
}

public interface IRecruitmentSettingsRepository : IRepository<RecruitmentSettings> { }

public class RecruitmentSettingsRepository : Repository<RecruitmentSettings>, IRecruitmentSettingsRepository
{
    public RecruitmentSettingsRepository(MemBerContext context) : base(context) { }
}

public interface IRecruitmentCategoryRepository : IRepository<RecruitmentCategory> { }

public class RecruitmentCategoryRepository : Repository<RecruitmentCategory>, IRecruitmentCategoryRepository
{
    public RecruitmentCategoryRepository(MemBerContext context) : base(context) { }
}

public interface IRecruitmentMailTemplateRepository : IRepository<RecruitmentMailTemplate> { }

public class RecruitmentMailTemplateRepository : Repository<RecruitmentMailTemplate>, IRecruitmentMailTemplateRepository
{
    public RecruitmentMailTemplateRepository(MemBerContext context) : base(context) { }
}
